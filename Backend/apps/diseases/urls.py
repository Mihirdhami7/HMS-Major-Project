from django.urls import path

from .views import DiseaseListCreateView, DiseaseDetailView

urlpatterns = [
    path("", DiseaseListCreateView.as_view(), name="disease_list_create"),            # GET public / POST superadmin
    path("<str:disease_id>/", DiseaseDetailView.as_view(), name="disease_detail"),    # PATCH / DELETE superadmin
]
