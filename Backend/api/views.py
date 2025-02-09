from django.http import JsonResponse
from django.contrib.auth import authenticate
from rest_framework.decorators import api_view, permission_classes
from rest_framework.response import Response
from rest_framework import status
from rest_framework.permissions import AllowAny
from .models import CustomUser, UserProfile
from .serializers import CustomUserSerializer

@api_view(['POST'])
def register_user(request):
    """ Register a new user """
    data = request.data.copy()  # Ensure mutable data
    email = data.get("email")
    if CustomUser.objects.filter(email=email).exists():
        return Response({"error": "A user with this email already exists. Please log in."}, status=status.HTTP_400_BAD_REQUEST)

    # Extract photo from request files (if available)
    photo = request.FILES.get('photo')

    serializer = CustomUserSerializer(data=data)
    if serializer.is_valid():
        user = serializer.save()  # Save CustomUser

        # ✅ Ensure UserProfile is created only if it doesn’t exist
        user_profile, created = UserProfile.objects.get_or_create(user=user)

        if photo:  # ✅ Only update the photo if it's provided
            user_profile.photo = photo
            user_profile.save()

        return Response(serializer.data, status=status.HTTP_201_CREATED)
    
    return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

@api_view(['POST'])
def login_user(request):
    """ Login user with email and password """
    email = request.data.get('email')
    password = request.data.get('password')

    if not email or not password:
        return JsonResponse({'message': 'Email and password are required'}, status=400)

    try:
        user = CustomUser.objects.get(email=email)
    except CustomUser.DoesNotExist:
        return JsonResponse({'message': 'Invalid credentials'}, status=401)

    # Authenticate the user (Ensure password is correct)
    if user.check_password(password):
        # Generate or fetch the authentication token
        token, created = Token.objects.get_or_create(user=user)

        return JsonResponse({
            'message': 'Login successful',
            'user_type': user.userType,
            'token': token.key  # ✅ Return the token for authentication
        })

    return JsonResponse({'message': 'Invalid credentials'}, status=401)


@api_view(['GET'])
@permission_classes([AllowAny])
def get_all_users(request):
    users = CustomUser.objects.all()
    serializer = CustomUserSerializer(users, many=True)
    return Response(serializer.data)