import os
from flask import Flask, render_template, request, jsonify, session, redirect, url_for
from werkzeug.security import generate_password_hash, check_password_hash
from dotenv import load_dotenv
from supabase import create_client, Client

load_dotenv()

app = Flask(__name__)
app.config['SECRET_KEY'] = 'dev_secret_key'

url = os.environ.get("SUPABASE_URL")
key = os.environ.get("SUPABASE_KEY")
if url and key:
    supabase: Client = create_client(url, key)
else:
    supabase = None

def get_letter_grade(midterm, final, project, presentation):
    if midterm is None and final is None:
        return '-'
    m = midterm or 0
    f = final or 0
    p = project or 0
    pr = presentation or 0
    score = (m * 0.3) + (f * 0.5) + (p * 0.1) + (pr * 0.1)
    if score >= 90: return 'AA'
    elif score >= 85: return 'BA'
    elif score >= 80: return 'BB'
    elif score >= 75: return 'CB'
    elif score >= 70: return 'CC'
    elif score >= 65: return 'DC'
    elif score >= 60: return 'DD'
    elif score >= 50: return 'FD'
    else: return 'FF'

def login_required(role=None):
    def wrapper(f):
        def wrapped(*args, **kwargs):
            if 'user_id' not in session:
                return redirect(url_for('login'))
            if role and session.get('role') != role:
                return "Yetkisiz Erişim", 403
            return f(*args, **kwargs)
        wrapped.__name__ = f.__name__
        return wrapped
    return wrapper

@app.route('/')
def index():
    if 'user_id' in session:
        return redirect(url_for(f"{session['role']}_dashboard"))
    return redirect(url_for('login'))

@app.route('/login', methods=['GET', 'POST'])
def login():
    if request.method == 'POST':
        if not supabase: return jsonify({'success': False, 'message': 'Supabase bağlantısı yok'}), 500
        data = request.get_json()
        res = supabase.table('users').select('*').eq('username', data.get('username')).execute()
        if res.data and len(res.data) > 0:
            user = res.data[0]
            if check_password_hash(user['password_hash'], data.get('password')):
                session['user_id'] = user['id']
                session['role'] = user['role']
                session['name'] = user['name']
                return jsonify({'success': True, 'redirect': url_for(f"{user['role']}_dashboard")})
        return jsonify({'success': False, 'message': 'Hatalı kullanıcı adı veya şifre'}), 401
    return render_template('login.html')

@app.route('/logout')
def logout():
    session.clear()
    return redirect(url_for('login'))

# ----- ADMIN ROUTES -----
@app.route('/admin')
@login_required('admin')
def admin_dashboard():
    return render_template('admin.html', name=session.get('name'))

@app.route('/api/admin/users', methods=['GET', 'POST'])
@login_required('admin')
def manage_users():
    if request.method == 'POST':
        data = request.get_json()
        exist = supabase.table('users').select('*').eq('username', data['username']).execute()
        if exist.data and len(exist.data) > 0:
            return jsonify({'success': False, 'message': 'Kullanıcı adı zaten var'}), 400
        
        pw_hash = generate_password_hash(data['password'])
        supabase.table('users').insert({
            'username': data['username'],
            'password_hash': pw_hash,
            'role': data['role'],
            'name': data['name']
        }).execute()
        return jsonify({'success': True})
    
    users = supabase.table('users').select('*').execute().data
    return jsonify([{'id': u['id'], 'username': u['username'], 'role': u['role'], 'name': u['name']} for u in users])

@app.route('/api/admin/courses', methods=['GET', 'POST'])
@login_required('admin')
def manage_courses():
    if request.method == 'POST':
        data = request.get_json()
        supabase.table('courses').insert({
            'code': data.get('code', ''),
            'name': data['name'],
            'instructor_id': data['instructor_id']
        }).execute()
        return jsonify({'success': True})
    
    courses = supabase.table('courses').select('*').execute().data
    instructor_ids = [c['instructor_id'] for c in courses]
    instructors = supabase.table('users').select('id, name').in_('id', instructor_ids).execute().data if instructor_ids else []
    inst_map = {i['id']: i['name'] for i in instructors}
    
    return jsonify([{
        'id': c['id'],
        'code': c.get('code', ''),
        'name': c['name'], 
        'instructor_id': c['instructor_id'], 
        'instructor_name': inst_map.get(c['instructor_id'], 'Bilinmiyor')
    } for c in courses])

@app.route('/api/admin/academicians')
@login_required('admin')
def get_academicians():
    acads = supabase.table('users').select('id, name').eq('role', 'academician').execute().data
    return jsonify(acads)

@app.route('/api/admin/students')
@login_required('admin')
def get_students():
    students = supabase.table('users').select('id, name, username').eq('role', 'student').execute().data
    return jsonify(students)

@app.route('/api/admin/enroll', methods=['POST'])
@login_required('admin')
def enroll_student():
    data = request.get_json()
    existing = supabase.table('enrollments').select('*').eq('student_id', data['student_id']).eq('course_id', data['course_id']).execute().data
    if existing:
        return jsonify({'success': False, 'message': 'Öğrenci zaten bu derse kayıtlı.'}), 400
    
    supabase.table('enrollments').insert({
        'student_id': data['student_id'],
        'course_id': data['course_id']
    }).execute()
    return jsonify({'success': True})

# ----- ACADEMICIAN ROUTES -----
@app.route('/academician')
@login_required('academician')
def academician_dashboard():
    return render_template('academician.html', name=session.get('name'))

@app.route('/api/academician/courses')
@login_required('academician')
def academician_courses():
    courses = supabase.table('courses').select('*').eq('instructor_id', session['user_id']).execute().data
    return jsonify([{'id': c['id'], 'code': c.get('code', ''), 'name': c['name'], 'published': c.get('grades_published', False)} for c in courses])

@app.route('/api/academician/course/<int:course_id>/publish', methods=['POST'])
@login_required('academician')
def publish_grades(course_id):
    course_res = supabase.table('courses').select('*').eq('id', course_id).execute()
    if not course_res.data:
        return "Not Found", 404
    course = course_res.data[0]
    if course['instructor_id'] != session['user_id']:
        return "Yetkisiz Erişim", 403
    
    supabase.table('courses').update({'grades_published': True}).eq('id', course_id).execute()
    return jsonify({'success': True})

@app.route('/api/academician/course/<int:course_id>/students')
@login_required('academician')
def course_students(course_id):
    course_res = supabase.table('courses').select('*').eq('id', course_id).execute()
    if not course_res.data:
        return "Not Found", 404
    course = course_res.data[0]
    if course['instructor_id'] != session['user_id']:
        return "Yetkisiz Erişim", 403
        
    enrollments = supabase.table('enrollments').select('*').eq('course_id', course_id).execute().data
    student_ids = [e['student_id'] for e in enrollments]
    students = supabase.table('users').select('id, name').in_('id', student_ids).execute().data if student_ids else []
    student_map = {s['id']: s['name'] for s in students}
    
    return jsonify([{
        'enrollment_id': e['id'],
        'student_id': e['student_id'],
        'student_name': student_map.get(e['student_id'], 'Bilinmiyor'),
        'attendance': e.get('attendance', 0),
        'midterm': e.get('midterm'),
        'final': e.get('final'),
        'project': e.get('project'),
        'presentation': e.get('presentation'),
        'letter': get_letter_grade(e.get('midterm'), e.get('final'), e.get('project'), e.get('presentation')) if course.get('grades_published') else '-'
    } for e in enrollments])

@app.route('/api/academician/grade', methods=['POST'])
@login_required('academician')
def update_grade():
    data = request.get_json()
    enrollment_id = data['enrollment_id']
    enr_res = supabase.table('enrollments').select('*').eq('id', enrollment_id).execute()
    if not enr_res.data:
        return "Not Found", 404
    enrollment = enr_res.data[0]
    
    course_res = supabase.table('courses').select('*').eq('id', enrollment['course_id']).execute()
    if not course_res.data or course_res.data[0]['instructor_id'] != session['user_id']:
        return "Yetkisiz Erişim", 403
    
    update_data = {}
    if 'midterm' in data: update_data['midterm'] = data['midterm'] if data['midterm'] != '' else None
    if 'final' in data: update_data['final'] = data['final'] if data['final'] != '' else None
    if 'project' in data: update_data['project'] = data['project'] if data['project'] != '' else None
    if 'presentation' in data: update_data['presentation'] = data['presentation'] if data['presentation'] != '' else None
    if 'attendance' in data: update_data['attendance'] = data['attendance']
    
    if update_data:
        supabase.table('enrollments').update(update_data).eq('id', enrollment_id).execute()
    
    return jsonify({'success': True})

@app.route('/api/academician/student/<int:student_id>')
@login_required('academician')
def view_student(student_id):
    courses_taught = supabase.table('courses').select('id').eq('instructor_id', session['user_id']).execute().data
    taught_ids = [c['id'] for c in courses_taught]
    
    enrollments = supabase.table('enrollments').select('*').eq('student_id', student_id).execute().data
    teaches_student = any(e['course_id'] in taught_ids for e in enrollments)
    if not teaches_student:
        return "Yetkisiz Erişim", 403
    
    student_res = supabase.table('users').select('*').eq('id', student_id).execute()
    if not student_res.data:
        return "Not Found", 404
    student = student_res.data[0]
    
    course_ids = [e['course_id'] for e in enrollments]
    courses = supabase.table('courses').select('id, name, code, grades_published').in_('id', course_ids).execute().data if course_ids else []
    course_map = {c['id']: c for c in courses}
    
    student_data = {
        'id': student['id'],
        'name': student['name'],
        'enrollments': [{
            'course_name': course_map.get(e['course_id'], {}).get('name', 'Bilinmiyor'),
            'attendance': e.get('attendance', 0),
            'midterm': e.get('midterm'),
            'final': e.get('final'),
            'project': e.get('project'),
            'presentation': e.get('presentation'),
            'letter': get_letter_grade(e.get('midterm'), e.get('final'), e.get('project'), e.get('presentation')) if course_map.get(e['course_id'], {}).get('grades_published') else '-'
        } for e in enrollments]
    }
    return jsonify(student_data)

# ----- STUDENT ROUTES -----
@app.route('/student')
@login_required('student')
def student_dashboard():
    return render_template('student.html', name=session.get('name'))

@app.route('/api/student/enrollments')
@login_required('student')
def student_enrollments():
    enrollments = supabase.table('enrollments').select('*').eq('student_id', session['user_id']).execute().data
    course_ids = [e['course_id'] for e in enrollments]
    courses = supabase.table('courses').select('*').in_('id', course_ids).execute().data if course_ids else []
    course_map = {c['id']: c for c in courses}
    
    inst_ids = [c['instructor_id'] for c in courses]
    instructors = supabase.table('users').select('id, name').in_('id', inst_ids).execute().data if inst_ids else []
    inst_map = {i['id']: i['name'] for i in instructors}
    
    return jsonify([{
        'course_id': e['course_id'],
        'course_code': course_map.get(e['course_id'], {}).get('code', ''),
        'course_name': course_map.get(e['course_id'], {}).get('name', 'Bilinmiyor'),
        'instructor_name': inst_map.get(course_map.get(e['course_id'], {}).get('instructor_id'), 'Bilinmiyor'),
        'attendance': e.get('attendance', 0),
        'midterm': e.get('midterm'),
        'final': e.get('final'),
        'project': e.get('project'),
        'presentation': e.get('presentation'),
        'letter': get_letter_grade(e.get('midterm'), e.get('final'), e.get('project'), e.get('presentation')) if course_map.get(e['course_id'], {}).get('grades_published') else 'Ilan Edilmedi'
    } for e in enrollments])

if __name__ == '__main__':
    app.run(debug=True, port=5000)
