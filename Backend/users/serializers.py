from rest_framework import serializers

class UserSerializer(serializers.Serializer):
    id = serializers.CharField(read_only=True)
    name = serializers.CharField(max_length=255)
    email = serializers.EmailField()
    password = serializers.CharField(write_only=True)  # Don't return passwords
    contact_no = serializers.CharField(max_length=15)
    date_of_birth = serializers.DateField()
    user_type = serializers.CharField()
    gender = serializers.CharField()
    photo = serializers.CharField(allow_blank=True, required=False)
