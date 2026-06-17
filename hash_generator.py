import sys
from werkzeug.security import generate_password_hash

if len(sys.argv) > 1:
    password = sys.argv[1]
else:
    password = input("Lütfen şifrelenecek metni (örn: 1234) girin: ")

hashed = generate_password_hash(password)
print("\n=== SUPABASE PASSWORD_HASH SÜTUNUNA YAPIŞTIRILACAK DEĞER ===")
print(hashed)
print("========================================================\n")
