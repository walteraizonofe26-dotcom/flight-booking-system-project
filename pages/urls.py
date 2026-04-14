from django.urls import path
from . import views

app_name = 'pages'

urlpatterns = [
    path('', views.home, name='home'),
    path('book/', views.book, name='book'),
    path('contact/', views.contact, name='contact'),
    path('about', views.about, name='about'),
]