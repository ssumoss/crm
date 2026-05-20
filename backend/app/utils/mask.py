def mask_email(email):
    if not email or "@" not in email:
        return email

    name, domain = email.split("@", 1)

    if len(name) <= 2:
        return name[0] + "***@" + domain

    return name[:2] + "***@" + domain


def mask_phone(phone):
    if not phone:
        return phone

    phone = str(phone)

    if len(phone) <= 4:
        return "***"

    return phone[:3] + "****" + phone[-2:]


def has_sensitive_permission(current_user):
    return current_user and current_user.rol_id in [1, 2]