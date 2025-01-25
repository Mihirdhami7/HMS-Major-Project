from django.contrib.auth import get_user_model
from django.contrib.auth.hashers import make_password
from django.http import JsonResponse
from django.core.mail import send_mail
from django.shortcuts import render
from django.views.decorators.csrf import csrf_exempt
import uuid

User = get_user_model()

# Store verification tokens in memory for now (you can use a model for this)
verification_tokens = {}

@csrf_exempt
def signup_view(request):
    if request.method == 'POST':
        username = request.POST['username']
        email = request.POST['email']
        password = request.POST['password']

        if User.objects.filter(email=email).exists():
            return JsonResponse({'error': 'Email already exists'}, status=400)

        # Create user and save with hashed password
        user = User(username=username, email=email, password=make_password(password))
        user.save()

        # Generate a verification token
        token = str(uuid.uuid4())
        verification_tokens[email] = token

        # Send a verification email
        verification_link = f"http://127.0.0.1:8000/api/verify-email?token={token}&email={email}"
        send_mail(
            subject='Verify your email',
            message=f'Click the link to verify your email: {verification_link}',
            from_email='your_email@example.com',
            recipient_list=[email],
        )

        return JsonResponse({'message': 'User registered. Please check your email to verify your account.'})

    return JsonResponse({'error': 'Invalid request'}, status=400)


@csrf_exempt
def verify_email(request):
    if request.method == 'GET':
        email = request.GET['email']
        token = request.GET['token']

        if email in verification_tokens and verification_tokens[email] == token:
            user = User.objects.get(email=email)
            user.is_email_verified = True
            user.save()

            # Remove the token once verified
            del verification_tokens[email]

            return JsonResponse({'message': 'Email verified successfully.'})
        return JsonResponse({'error': 'Invalid or expired token'}, status=400)

    return JsonResponse({'error': 'Invalid request'}, status=400)


from django.contrib.auth import authenticate

@csrf_exempt
def login_view(request):
    if request.method == 'POST':
        email = request.POST['email']
        password = request.POST['password']

        try:
            user = User.objects.get(email=email)
            if not user.is_email_verified:
                return JsonResponse({'error': 'Email not verified'}, status=400)

            user = authenticate(request, username=user.username, password=password)
            if user is not None:
                return JsonResponse({'message': 'Login successful'})
            return JsonResponse({'error': 'Invalid credentials'}, status=400)
        except User.DoesNotExist:
            return JsonResponse({'error': 'User does not exist'}, status=400)

    return JsonResponse({'error': 'Invalid request'}, status=400)
