from fastapi import APIRouter, Depends, HTTPException
from ..deps import CurrentUser, admin_client, get_current_user
from ..config import settings
from ..deps import admin_client

router = APIRouter(prefix="/api/admin", tags=["admin"])
def require_admin(user: CurrentUser = Depends(get_current_user)):
    role = user.client.table("user_roles") \
        .select("role") \
        .eq("user_id", user.id) \
        .execute()

    roles = [r["role"] for r in role.data]

    if "admin" not in roles:
        raise HTTPException(403, "Admin only")

    return user


@router.post("/approve/{user_id}")
def approve_user(user_id: str, user: CurrentUser = Depends(require_admin)):
    res = user.client.table("profiles").update({
    "is_approved": True
    }).eq("id", user_id).execute()

    if not res.data:
        raise HTTPException(404, "User not found")

    return {"message": "User approved"}


@router.delete("/user/{user_id}")
def delete_user(user_id: str, user: CurrentUser = Depends(require_admin)):
    if user_id == user.id:
        raise HTTPException(400, "You cannot delete your own account")
    admin_client().auth.admin.delete_user(user_id)

    return {"message": "User deleted"}  


@router.post("/make-admin/{user_id}")
def make_admin(user_id: str, user: CurrentUser = Depends(require_admin)):
    user.client.table("user_roles").insert({
    "user_id": user_id,
    "role": "admin"
    }).execute()

    return {"message": "User promoted to admin"}


@router.post("/remove-admin/{user_id}")
def remove_admin(user_id: str, user: CurrentUser = Depends(require_admin)):
    user.client.table("user_roles").delete() \
    .eq("user_id", user_id) \
    .eq("role", "admin") \
    .execute()

    return {"message": "Admin removed"}


@router.delete("/material/{material_id}")
def delete_material(material_id: str, user: CurrentUser = Depends(require_admin)):
    material = user.client.table("materials") \
        .select("file_path") \
        .eq("id", material_id) \
        .execute()

    if not material.data:
        raise HTTPException(404, "Material not found")

    file_path = material.data[0]["file_path"]
    if not file_path:
        raise HTTPException(400, "Invalid file path")

    user.client.storage.from_(settings.materials_bucket).remove([file_path])
    user.client.table("materials").delete().eq("id", material_id).execute()

    return {"message": "File deleted"}


@router.get("/stats")
def stats(user: CurrentUser = Depends(require_admin)):
    materials = user.client.table("materials").select("*").execute()
    events = user.client.table("material_events").select("*").execute()

    return {
    "total_materials": len(materials.data),
    "total_events": len(events.data),
    "downloads": len([e for e in events.data if e["event_type"] == "download"]),
    "views": len([e for e in events.data if e["event_type"] == "view"]),
    }  
