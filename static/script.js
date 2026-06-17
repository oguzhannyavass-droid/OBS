// Theme Toggle Logic
function initThemeToggle() {
    const toggleBtn = document.getElementById('themeToggle');
    if(!toggleBtn) return;
    
    // Check local storage or system preference
    const savedTheme = localStorage.getItem('obs_theme');
    if (savedTheme === 'light') {
        document.documentElement.classList.add('light-mode');
        toggleBtn.textContent = '🌙';
    } else {
        document.documentElement.classList.remove('light-mode');
        toggleBtn.textContent = '☀️';
    }

    toggleBtn.addEventListener('click', () => {
        document.documentElement.classList.toggle('light-mode');
        const isLight = document.documentElement.classList.contains('light-mode');
        localStorage.setItem('obs_theme', isLight ? 'light' : 'dark');
        toggleBtn.textContent = isLight ? '🌙' : '☀️';
    });
}
document.addEventListener('DOMContentLoaded', initThemeToggle);

// Custom Toast Notification System
function showToast(message, type = 'success') {
    let container = document.getElementById('toast-container');
    if (!container) {
        container = document.createElement('div');
        container.id = 'toast-container';
        document.body.appendChild(container);
    }
    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = type === 'success' ? `✅ ${message}` : `⚠️ ${message}`;
    container.appendChild(toast);

    // Trigger reflow for animation
    setTimeout(() => toast.classList.add('show'), 10);

    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}

// Login Handling
const loginForm = document.getElementById('loginForm');
if (loginForm) {
    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const username = document.getElementById('username').value;
        const password = document.getElementById('password').value;
        const errorDiv = document.getElementById('loginError');
        const btn = loginForm.querySelector('button');
        
        // Button loading animation
        const originalText = btn.textContent;
        btn.textContent = 'Giriş yapılıyor...';
        btn.style.opacity = '0.7';
        btn.style.pointerEvents = 'none';

        try {
            const res = await fetch('/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ username, password })
            });
            const data = await res.json();
            if (data.success) {
                // Success animation for login container
                const container = document.querySelector('.login-container');
                container.style.transform = 'scale(0.95)';
                container.style.opacity = '0';
                setTimeout(() => {
                    window.location.href = data.redirect;
                }, 300);
            } else {
                errorDiv.textContent = data.message;
                // Shake effect on error
                const container = document.querySelector('.login-container');
                container.animate([
                    { transform: 'translateX(0)' },
                    { transform: 'translateX(-10px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(-10px)' },
                    { transform: 'translateX(10px)' },
                    { transform: 'translateX(0)' }
                ], { duration: 400 });
                btn.textContent = originalText;
                btn.style.opacity = '1';
                btn.style.pointerEvents = 'all';
            }
        } catch (err) {
            errorDiv.textContent = 'Bir hata oluştu.';
            btn.textContent = originalText;
            btn.style.opacity = '1';
            btn.style.pointerEvents = 'all';
        }
    });
}

// Format Helper
function formatGrade(grade) {
    return grade === null || grade === undefined ? '-' : grade;
}

// Admin Dashboard Init
async function initAdminDashboard() {
    loadUsers();
    loadCourses();
    loadAcademiciansToSelect();
    loadStudentsToSelect();
    loadCoursesToSelect();

    document.getElementById('addUserForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('newUserName').value;
        const username = document.getElementById('newUserUsername').value;
        const password = document.getElementById('newUserPassword').value;
        const role = document.getElementById('newUserRole').value;

        const res = await fetch('/api/admin/users', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, username, password, role })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Kullanıcı başarıyla eklendi.', 'success');
            e.target.reset();
            loadUsers();
            if (role === 'academician') loadAcademiciansToSelect();
        } else {
            showToast(data.message, 'error');
        }
    });

    document.getElementById('addCourseForm').addEventListener('submit', async (e) => {
        e.preventDefault();
        const code = document.getElementById('newCourseCode').value;
        const name = document.getElementById('newCourseName').value;
        const instructor_id = document.getElementById('courseInstructor').value;

        const res = await fetch('/api/admin/courses', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ code, name, instructor_id })
        });
        const data = await res.json();
        if (data.success) {
            showToast('Ders başarıyla eklendi.', 'success');
            e.target.reset();
            loadCourses();
            loadCoursesToSelect();
        }
    });

    const enrollForm = document.getElementById('enrollStudentForm');
    if(enrollForm) {
        enrollForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const student_id = document.getElementById('enrollStudent').value;
            const course_id = document.getElementById('enrollCourse').value;

            const res = await fetch('/api/admin/enroll', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ student_id, course_id })
            });
            const data = await res.json();
            if (data.success) {
                showToast('Öğrenci derse başarıyla kaydedildi.', 'success');
                e.target.reset();
            } else {
                showToast(data.message, 'error');
            }
        });
    }
}

async function loadUsers() {
    const res = await fetch('/api/admin/users');
    const users = await res.json();
    const tbody = document.getElementById('usersList');
    tbody.innerHTML = ''; 
    
    // Slight delay for smooth UI update effect
    setTimeout(() => {
        const numAcademicians = users.filter(u => u.role === 'academician').length;
        const numStudents = users.filter(u => u.role === 'student').length;
        
        const elTotal = document.getElementById('statTotalUsers');
        const elStud = document.getElementById('statTotalStudents');
        const elAcad = document.getElementById('statTotalAcademicians');
        
        if(elTotal) elTotal.textContent = users.length;
        if(elStud) elStud.textContent = numStudents;
        if(elAcad) elAcad.textContent = numAcademicians;

        tbody.innerHTML = users.map(u => `
            <tr>
                <td>${u.id}</td>
                <td><strong>${u.name}</strong></td>
                <td>${u.username}</td>
                <td><span style="background:rgba(99,102,241,0.1);color:var(--primary-color);padding:4px 8px;border-radius:6px;font-size:0.85em;font-weight:600;">${u.role}</span></td>
                <td>
                    <button class="btn btn-outline btn-sm" style="color:#ef4444; border-color:rgba(239, 68, 68, 0.3);" onclick="deleteUser(${u.id}, '${u.name}')">🗑️ Sil</button>
                </td>
            </tr>
        `).join('');
    }, 50);
}

async function loadCourses() {
    const res = await fetch('/api/admin/courses');
    const courses = await res.json();
    const tbody = document.getElementById('coursesList');
    tbody.innerHTML = '';
    
    setTimeout(() => {
        const elTotalC = document.getElementById('statTotalCourses');
        if(elTotalC) elTotalC.textContent = courses.length;

        tbody.innerHTML = courses.map(c => `
            <tr>
                <td>${c.id}</td>
                <td><strong>${c.name}</strong></td>
                <td>${c.instructor_name}</td>
                <td>
                    <button class="btn btn-outline btn-sm" style="color:#ef4444; border-color:rgba(239, 68, 68, 0.3);" onclick="deleteCourse(${c.id}, '${c.name}')">🗑️ Sil</button>
                </td>
            </tr>
        `).join('');
    }, 100);
}

async function loadAcademiciansToSelect() {
    const res = await fetch('/api/admin/academicians');
    const academicians = await res.json();
    const select = document.getElementById('courseInstructor');
    if(select) select.innerHTML = '<option value="" disabled selected>— Akademisyen seçiniz —</option>' + academicians.map(a => `<option value="${a.id}">${a.name}</option>`).join('');
}

async function loadStudentsToSelect() {
    const res = await fetch('/api/admin/students');
    const students = await res.json();
    const select = document.getElementById('enrollStudent');
    if(select) select.innerHTML = '<option value="" disabled selected>— Öğrenci seçiniz —</option>' + students.map(s => `<option value="${s.id}">${s.name} (${s.username})</option>`).join('');
}

async function loadCoursesToSelect() {
    const res = await fetch('/api/admin/courses');
    const courses = await res.json();
    const select = document.getElementById('enrollCourse');
    if(select) select.innerHTML = '<option value="" disabled selected>— Ders seçiniz —</option>' + courses.map(c => `<option value="${c.id}">${c.code ? c.code + ' - ' : ''}${c.name}</option>`).join('');
}

async function deleteUser(id, name) {
    if(!confirm(`'${name}' isimli kullanıcıyı tamamen silmek istediğinize emin misiniz?\n(Bu işlem kullanıcının tüm kayıtlarını silecektir!)`)) return;
    
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if(data.success) {
        showToast('Kullanıcı başarıyla silindi.', 'success');
        loadUsers();
        loadAcademiciansToSelect();
        loadStudentsToSelect();
    } else {
        showToast(data.message || 'Hata oluştu.', 'error');
    }
}

async function deleteCourse(id, name) {
    if(!confirm(`'${name}' dersini silmek istediğinize emin misiniz?\n(Derse kayıtlı tüm öğrencilerin notları da silinecektir!)`)) return;
    
    const res = await fetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if(data.success) {
        showToast('Ders başarıyla silindi.', 'success');
        loadCourses();
        loadCoursesToSelect();
    } else {
        showToast(data.message || 'Hata oluştu.', 'error');
    }
}

// Academician Dashboard Init
async function initAcademicianDashboard() {
    const res = await fetch('/api/academician/courses');
    const courses = await res.json();
    const list = document.getElementById('academicianCourses');
    
    const elMyCourses = document.getElementById('statMyCourses');
    if(elMyCourses) elMyCourses.textContent = courses.length;

    if (courses.length === 0) {
        list.innerHTML = '<p style="color:var(--text-muted)">Size atanmış ders bulunmuyor.</p>';
        return;
    }

    list.className = 'course-grid';
    list.innerHTML = courses.map((c, i) => `
        <div class="course-card" style="animation: slideUpFade ${0.4 + (i*0.1)}s cubic-bezier(0.16, 1, 0.3, 1) forwards; opacity: 0; transform: translateY(20px);" onclick="loadCourseStudents(${c.id}, '${c.name}', ${c.published}, this)">
            <div class="course-title">${c.name}</div>
            <div class="course-icon">📚</div>
        </div>
    `).join('');

    // Modal close logic with animation
    const modal = document.getElementById('studentModal');
    document.querySelector('.close-modal').addEventListener('click', closeModalHandler);
    window.onclick = function(event) {
        if (event.target == modal) {
            closeModalHandler();
        }
    }
}

function closeModalHandler() {
    const modal = document.getElementById('studentModal');
    modal.classList.remove('show');
    setTimeout(() => {
        modal.style.display = 'none';
    }, 300);
}

let currentSelectedCourseId = null;

async function loadCourseStudents(courseId, courseName, isPublished, el) {
    currentSelectedCourseId = courseId;
    document.querySelectorAll('.course-card').forEach(i => {
        i.classList.remove('active');
    });
    el.classList.add('active');
    
    const detailsCard = document.getElementById('courseDetails');
    detailsCard.classList.remove('hidden');
    // Re-trigger animation
    detailsCard.style.animation = 'none';
    detailsCard.offsetHeight; /* trigger reflow */
    detailsCard.style.animation = null; 

    document.getElementById('selectedCourseName').textContent = `${courseName} - Öğrenci Listesi`;
    
    const publishBtn = document.getElementById('publishGradesBtn');
    publishBtn.classList.remove('hidden');
    if(isPublished) {
        publishBtn.textContent = 'Notlar İlan Edildi';
        publishBtn.disabled = true;
        publishBtn.classList.add('btn-outline');
        publishBtn.classList.remove('btn-primary');
    } else {
        publishBtn.textContent = 'Notları İlan Et';
        publishBtn.disabled = false;
        publishBtn.classList.remove('btn-outline');
        publishBtn.classList.add('btn-primary');
    }

    const res = await fetch(`/api/academician/course/${courseId}/students`);
    const students = await res.json();
    const tbody = document.getElementById('courseStudentsList');

    tbody.innerHTML = '';
    
    setTimeout(() => {
        if (students.length === 0) {
            tbody.innerHTML = '<tr><td colspan="8" style="text-align:center; color:var(--text-muted); padding: 2rem;">Bu derse kayıtlı öğrenci bulunmuyor.</td></tr>';
            return;
        }

        tbody.innerHTML = students.map(s => `
            <tr>
                <td><strong>${s.student_name}</strong></td>
                <td><input type="number" class="grade-input" id="att_${s.enrollment_id}" value="${formatGrade(s.attendance)}"></td>
                <td><input type="number" class="grade-input" id="mid_${s.enrollment_id}" value="${formatGrade(s.midterm)}"></td>
                <td><input type="number" class="grade-input" id="fin_${s.enrollment_id}" value="${formatGrade(s.final)}"></td>
                <td><input type="number" class="grade-input" id="prj_${s.enrollment_id}" value="${formatGrade(s.project)}"></td>
                <td><input type="number" class="grade-input" id="pre_${s.enrollment_id}" value="${formatGrade(s.presentation)}"></td>
                <td><span style="font-weight:700; color:var(--primary-color)">${s.letter}</span></td>
                <td><button class="btn btn-primary btn-sm" onclick="saveGrades(${s.enrollment_id}, this)">Kaydet</button></td>
                <td><button class="btn btn-outline btn-sm" onclick="viewStudentProfile(${s.student_id})">Profili</button></td>
            </tr>
        `).join('');
    }, 50);
}

async function saveGrades(enrollmentId, btnEl) {
    const attVal = document.getElementById(`att_${enrollmentId}`).value;
    const midVal = document.getElementById(`mid_${enrollmentId}`).value;
    const finVal = document.getElementById(`fin_${enrollmentId}`).value;
    const prjVal = document.getElementById(`prj_${enrollmentId}`).value;
    const preVal = document.getElementById(`pre_${enrollmentId}`).value;

    const data = {
        enrollment_id: enrollmentId,
        attendance: attVal !== '-' && attVal !== '' ? Number(attVal) : 0,
        midterm: midVal !== '-' && midVal !== '' ? Number(midVal) : '',
        final: finVal !== '-' && finVal !== '' ? Number(finVal) : '',
        project: prjVal !== '-' && prjVal !== '' ? Number(prjVal) : '',
        presentation: preVal !== '-' && preVal !== '' ? Number(preVal) : '',
    };

    // Button loading animation
    const originalText = btnEl.textContent;
    btnEl.innerHTML = '<span style="opacity:0.6">...</span>';
    btnEl.style.pointerEvents = 'none';
    
    const res = await fetch('/api/academician/grade', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
    });
    
    const result = await res.json();
    if(result.success) {
        showToast('Notlar başarıyla kaydedildi.', 'success');
        btnEl.textContent = '✔';
        btnEl.classList.remove('btn-primary');
        btnEl.style.backgroundColor = 'var(--success-color)';
        btnEl.style.color = 'white';
        btnEl.style.borderColor = 'var(--success-color)';
        
        setTimeout(() => {
            btnEl.textContent = originalText;
            btnEl.classList.add('btn-primary');
            btnEl.style.backgroundColor = '';
            btnEl.style.color = '';
            btnEl.style.borderColor = '';
            btnEl.style.pointerEvents = 'all';
        }, 2000);
    } else {
        showToast('Hata oluştu.', 'error');
        btnEl.textContent = originalText;
        btnEl.style.pointerEvents = 'all';
    }
}

async function publishCourseGrades() {
    if(!currentSelectedCourseId) return;
    if(!confirm("Notları ilan etmek istediğinize emin misiniz? Öğrenciler artık harf notlarını görebilecek.")) return;
    
    const btnEl = document.getElementById('publishGradesBtn');
    btnEl.textContent = 'İlan ediliyor...';
    btnEl.disabled = true;

    const res = await fetch(`/api/academician/course/${currentSelectedCourseId}/publish`, {
        method: 'POST'
    });
    const result = await res.json();
    if(result.success) {
        showToast('Notlar başarıyla ilan edildi.', 'success');
        btnEl.textContent = 'Notlar İlan Edildi';
        btnEl.classList.add('btn-outline');
        btnEl.classList.remove('btn-primary');
        // reload the list to show letter grades
        document.querySelector('.course-card.active').click();
    } else {
        showToast('Hata oluştu.', 'error');
        btnEl.disabled = false;
        btnEl.textContent = 'Notları İlan Et';
    }
}

async function viewStudentProfile(studentId) {
    const res = await fetch(`/api/academician/student/${studentId}`);
    if(!res.ok) {
        showToast('Bu öğrenciyi görüntüleme yetkiniz yok.', 'error');
        return;
    }
    const data = await res.json();
    
    document.getElementById('modalStudentName').textContent = `${data.name} Detaylı Profili`;
    const tbody = document.getElementById('modalStudentGrades');
    
    tbody.innerHTML = data.enrollments.map(e => `
        <tr>
            <td><strong>${e.course_code || '-'}</strong></td>
            <td><strong>${e.course_name}</strong></td>
            <td><span style="background:rgba(99,102,241,0.1);color:var(--primary-color);padding:4px 8px;border-radius:4px;">${formatGrade(e.attendance)}</span></td>
            <td>${formatGrade(e.midterm)}</td>
            <td>${formatGrade(e.final)}</td>
            <td>${formatGrade(e.project)}</td>
            <td>${formatGrade(e.presentation)}</td>
            <td><span style="font-weight:700; color:var(--primary-color)">${e.letter}</span></td>
        </tr>
    `).join('');

    const modal = document.getElementById('studentModal');
    modal.style.display = 'block';
    // Trigger reflow for CSS transition
    modal.offsetHeight;
    modal.classList.add('show');
}

// Student Dashboard Init
async function initStudentDashboard() {
    const res = await fetch('/api/student/enrollments');
    const enrollments = await res.json();
    const tbody = document.getElementById('studentGradesList');

    const elEnrolled = document.getElementById('statEnrolledCourses');
    const elAvg = document.getElementById('statAverageGrade');
    const elCompleted = document.getElementById('statCompleted');

    if(elEnrolled) elEnrolled.textContent = enrollments.length;

    const gradePoints = {
        'AA': 4.0, 'BA': 3.5, 'BB': 3.0, 'CB': 2.5,
        'CC': 2.0, 'DC': 1.5, 'DD': 1.0, 'FD': 0.5, 'FF': 0.0
    };

    let totalPoints = 0;
    let gradedCoursesCount = 0;
    
    enrollments.forEach(e => {
        if(e.letter && gradePoints[e.letter] !== undefined) {
            totalPoints += gradePoints[e.letter];
            gradedCoursesCount++;
        }
    });
    
    if(elAvg) {
        elAvg.textContent = gradedCoursesCount > 0 ? (totalPoints / gradedCoursesCount).toFixed(2) : '-';
    }
    if(elCompleted) {
        elCompleted.textContent = gradedCoursesCount;
    }

    if(enrollments.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" style="text-align:center; padding: 2rem; color:var(--text-muted)">Henüz bir derse kayıtlı değilsiniz.</td></tr>';
        return;
    }

    setTimeout(() => {
        tbody.innerHTML = enrollments.map(e => `
            <tr>
                <td><strong>${e.course_code || '-'}</strong></td>
                <td><strong>${e.course_name}</strong></td>
                <td>${e.instructor_name}</td>
                <td><span style="background:rgba(99,102,241,0.1);color:var(--primary-color);padding:4px 8px;border-radius:4px;font-weight:600;">${formatGrade(e.attendance)}</span></td>
                <td>${formatGrade(e.midterm)}</td>
                <td>${formatGrade(e.final)}</td>
                <td>${formatGrade(e.project)}</td>
                <td>${formatGrade(e.presentation)}</td>
                <td><span style="background:rgba(16, 185, 129, 0.1);color:var(--success-color);padding:4px 8px;border-radius:4px;font-weight:700;">${e.letter}</span></td>
            </tr>
        `).join('');
    }, 100);
}
