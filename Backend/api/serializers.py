from rest_framework import serializers
from .models import CustomUser, UserProfile

class UserProfileSerializer(serializers.ModelSerializer):
    class Meta:
        model = UserProfile
        fields = ['photo']

class CustomUserSerializer(serializers.ModelSerializer):
    user_profile = UserProfileSerializer(required=False)

    class Meta:
        model = CustomUser
        fields = ['id', 'email', 'name', 'contactNo', 'dateOfBirth', 'userType', 'gender', 'user_profile']

    def create(self, validated_data):
        user_profile_data = validated_data.pop('user_profile',None)
        user = CustomUser.objects.create(**validated_data)
        if user_profile_data:
            UserProfile.objects.create(user=user, **user_profile_data)
        return user