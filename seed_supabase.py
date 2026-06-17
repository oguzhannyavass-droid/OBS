import os
from dotenv import load_dotenv
from supabase import create_client, Client
from werkzeug.security import generate_password_hash

load_dotenv()

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")

if not url or not key:
    print("HATA: .env dosyasında SUPABASE_URL veya SUPABASE_KEY bulunamadı.")
    exit(1)

supabase: Client = create_client(url, key)

print("Supabase bağlantısı kuruldu. Örnek veriler (Kullanıcılar, Dersler, Notlar) oluşturuluyor...")

# 1. Kullanıcıları ekle
users = [
    {'username': 'admin', 'password_hash': generate_password_hash('1234'), 'role': 'admin', 'name': 'Sistem Yöneticisi'},
    {'username': 'ogrenci1', 'password_hash': generate_password_hash('1234'), 'role': 'student', 'name': 'Ahmet Yılmaz'},
    {'username': 'ogrenci2', 'password_hash': generate_password_hash('1234'), 'role': 'student', 'name': 'Ayşe Demir'},
    {'username': 'hoca1', 'password_hash': generate_password_hash('1234'), 'role': 'academician', 'name': 'Prof. Dr. Ali Veli'}
]

user_ids = {}
for user_data in users:
    existing = supabase.table('users').select('id').eq('username', user_data['username']).execute()
    if not existing.data:
        res = supabase.table('users').insert(user_data).execute()
        user_ids[user_data['username']] = res.data[0]['id']
        print(f"Kullanici Eklendi: {user_data['username']} (Sifre: 1234)")
    else:
        user_ids[user_data['username']] = existing.data[0]['id']
        print(f"{user_data['username']} zaten var. (ID: {existing.data[0]['id']})")

hoca_id = user_ids.get('hoca1')
ogr1_id = user_ids.get('ogrenci1')
ogr2_id = user_ids.get('ogrenci2')

if hoca_id and ogr1_id and ogr2_id:
    # 2. Dersleri ekle
    courses = [
        {'name': 'Python Programlama', 'instructor_id': hoca_id, 'grades_published': False},
        {'name': 'Veri Yapilari', 'instructor_id': hoca_id, 'grades_published': False}
    ]
    
    course_ids = {}
    for c in courses:
        existing_c = supabase.table('courses').select('id').eq('name', c['name']).execute()
        if not existing_c.data:
            res_c = supabase.table('courses').insert(c).execute()
            course_ids[c['name']] = res_c.data[0]['id']
            print(f"Ders Eklendi: {c['name']}")
        else:
            course_ids[c['name']] = existing_c.data[0]['id']
            print(f"{c['name']} zaten var.")
            
    c1_id = course_ids.get('Python Programlama')
    c2_id = course_ids.get('Veri Yapilari')
    
    if c1_id and c2_id:
        # 3. Kayitlari (Enrollments) ekle
        enrollments = [
            {'student_id': ogr1_id, 'course_id': c1_id, 'attendance': 12, 'midterm': 80, 'final': 90},
            {'student_id': ogr1_id, 'course_id': c2_id, 'attendance': 10, 'midterm': 60, 'final': 75},
            {'student_id': ogr2_id, 'course_id': c1_id, 'attendance': 14, 'midterm': 95, 'final': 100}
        ]
        
        for e in enrollments:
            existing_e = supabase.table('enrollments').select('id').eq('student_id', e['student_id']).eq('course_id', e['course_id']).execute()
            if not existing_e.data:
                supabase.table('enrollments').insert(e).execute()
                print(f"Kayit Eklendi (Ogrenci ID: {e['student_id']} -> Ders ID: {e['course_id']})")
            else:
                print(f"Kayit zaten var. (Ogrenci ID: {e['student_id']} -> Ders ID: {e['course_id']})")

print("\nISLEM TAMAMLANDI! Artik giris yapabilirsiniz.")
