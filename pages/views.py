from django.shortcuts import render

 #this is the Views for main pages (homepage and book page).

def home(request):
    return render(request, 'pages/home.html')


def book(request):
    return render(request, 'pages/book.html')

    
def contact(request):
    return render(request, 'pages/contact.html')


def about(request):
    return render(request, 'pages/about.html')