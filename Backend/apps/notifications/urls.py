from django.urls import path

from .views import NotificationListView, NotificationMarkReadView

urlpatterns = [
    path("", NotificationListView.as_view(), name="notification_list"),            # GET  my notifications
    path("read/", NotificationMarkReadView.as_view(), name="notification_read"),    # POST mark read (ids or all)
]
