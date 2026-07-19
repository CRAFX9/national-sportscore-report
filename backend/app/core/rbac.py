"""Role-Based Access Control. Roles + declarative permission map."""
from enum import Enum


class Role(str, Enum):
    COACH = "coach"
    DISTRICT_OFFICER = "district_officer"
    STATE_OFFICER = "state_officer"
    SAI_OFFICIAL = "sai_official"
    PARENT = "parent"
    ADMIN = "administrator"


class Permission(str, Enum):
    STUDENT_CREATE = "student:create"
    STUDENT_READ = "student:read"
    STUDENT_UPDATE = "student:update"
    STUDENT_DELETE = "student:delete"
    ASSESSMENT_CREATE = "assessment:create"
    ASSESSMENT_READ = "assessment:read"
    ASSESSMENT_APPROVE = "assessment:approve"
    REPORT_READ = "report:read"
    SCHOLARSHIP_APPROVE_DISTRICT = "scholarship:approve:district"
    SCHOLARSHIP_APPROVE_STATE = "scholarship:approve:state"
    SCHOLARSHIP_APPROVE_NATIONAL = "scholarship:approve:national"
    TRIAL_MANAGE = "trial:manage"
    ANALYTICS_DISTRICT = "analytics:district"
    ANALYTICS_STATE = "analytics:state"
    ANALYTICS_NATIONAL = "analytics:national"
    ADMIN_ALL = "admin:*"


ROLE_PERMISSIONS: dict[Role, set[Permission]] = {
    Role.COACH: {
        Permission.STUDENT_CREATE, Permission.STUDENT_READ, Permission.STUDENT_UPDATE,
        Permission.ASSESSMENT_CREATE, Permission.ASSESSMENT_READ, Permission.REPORT_READ,
    },
    Role.PARENT: {
        Permission.STUDENT_READ, Permission.REPORT_READ,
    },
    Role.DISTRICT_OFFICER: {
        Permission.STUDENT_READ, Permission.ASSESSMENT_READ, Permission.ASSESSMENT_APPROVE,
        Permission.REPORT_READ, Permission.SCHOLARSHIP_APPROVE_DISTRICT,
        Permission.TRIAL_MANAGE, Permission.ANALYTICS_DISTRICT,
    },
    Role.STATE_OFFICER: {
        Permission.STUDENT_READ, Permission.ASSESSMENT_READ, Permission.ASSESSMENT_APPROVE,
        Permission.REPORT_READ, Permission.SCHOLARSHIP_APPROVE_STATE,
        Permission.TRIAL_MANAGE, Permission.ANALYTICS_STATE,
    },
    Role.SAI_OFFICIAL: {
        Permission.STUDENT_READ, Permission.ASSESSMENT_READ, Permission.REPORT_READ,
        Permission.SCHOLARSHIP_APPROVE_NATIONAL, Permission.TRIAL_MANAGE,
        Permission.ANALYTICS_NATIONAL,
    },
    Role.ADMIN: {Permission.ADMIN_ALL},
}


def has_permission(role: Role, permission: Permission) -> bool:
    perms = ROLE_PERMISSIONS.get(role, set())
    return Permission.ADMIN_ALL in perms or permission in perms
