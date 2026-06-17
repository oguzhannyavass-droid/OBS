from app import app, db, User, Course, Enrollment

with app.app_context():
    students = []
    names = ['Fatma Çelik', 'Mehmet Şahin', 'Ali Yıldız', 'Zeynep Kaya', 'Elif Demir', 'Mustafa Öz', 'Ayşe Kılıç', 'Emre Can', 'Burak Arslan', 'Cemre Polat']
    for i in range(3, 13):
        username = f'ogrenci{i}'
        if not User.query.filter_by(username=username).first():
            student = User(username=username, role='student', name=names[i-3])
            student.set_password('1234')
            db.session.add(student)
            students.append(student)
    db.session.commit()

    c1 = Course.query.filter_by(name='Python Programlama').first()
    c2 = Course.query.filter_by(name='Veri Yapıları').first()

    for student in students:
        # enroll in both courses
        if c1 and not Enrollment.query.filter_by(student_id=student.id, course_id=c1.id).first():
            e1 = Enrollment(student_id=student.id, course_id=c1.id)
            db.session.add(e1)
        if c2 and not Enrollment.query.filter_by(student_id=student.id, course_id=c2.id).first():
            e2 = Enrollment(student_id=student.id, course_id=c2.id)
            db.session.add(e2)
    db.session.commit()
    print("Seeded 10 more students successfully.")
