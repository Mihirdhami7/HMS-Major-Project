from django.contrib.auth.models import AbstractUser
from django.db import models

class CustomUser(AbstractUser):
    email = models.EmailField(unique=True)  # Email field is required and unique
    is_email_verified = models.BooleanField(default=False)  # Verification flag
    phone = models.CharField(max_length=15, null=True, blank=True)  # Optional field

    def __str__(self):
        return self.username
