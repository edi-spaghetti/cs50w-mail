import os
import django

os.sys.path.append(os.path.realpath('../..'))
settings_module = 'project3.settings'
os.environ['DJANGO_SETTINGS_MODULE'] = settings_module

django.setup()
from mail.models import *

# drop existing database (if any) and run latest migration
os.system('python ../../manage.py flush')
os.system('python ../../manage.py makemigrations')
os.system('python ../../manage.py migrate')

print('Creating users')
admin = User.objects.create_superuser(
    'admin', password='admin', email='admin@mail.com'
)
admin.save()
sender = User.objects.create_user(
    'sender@mail.com', password='sender', email='sender@mail.com'
)
sender.save()
receiver = User.objects.create_user(
    'receiver@mail.com', password='receiver',
    email='receiver@mail.com'
)
receiver.save()
receiver2 = User.objects.create_user(
    'CCme@mail.com', password='receiver2', email='CCme@mail.com'
)
receiver2.save()

print('Creating emails')
welcome_template = """Dear User,

Thanks for joining Mail App! We hope you send (and receive!) many emails in
your bright emailing future. Good luck, and godspeed!

Yours,
Adam McAdminton
"""
for u in (sender, receiver, receiver2):
    welcome = Email(
        user=u, sender=admin, subject='Welcome to Mail',
        body=welcome_template,
    )
    welcome.save()
    welcome.recipients.add(u)
    welcome.save()
