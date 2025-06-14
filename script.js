(() => {
  'use strict';

  // Selektor elemen
  const todoForm = document.getElementById('todo-form');
  const todoTextarea = document.getElementById('todo-textarea');
  const prioritySelect = document.getElementById('priority-select');
  const deadlineDate = document.getElementById('deadline-date');
  const todoPendingList = document.getElementById('todo-pending');
  const todoDoneList = document.getElementById('todo-done');
  const todoOverdueList = document.getElementById('todo-overdue');
  const overdueSection = document.getElementById('overdue-list');
  const deleteAllBtn = document.getElementById('delete-all-btn');

  // Set deadline default ke hari ini
  const today = new Date().toISOString().split('T')[0];
  deadlineDate.value = today;
  deadlineDate.min = today;

  // Simpan todo di memori
  let todos = [];

  // Penyimpanan di localStorage
  const STORAGE_KEY = 'rise-todo-list';

  function loadTodos() {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      todos = stored ? JSON.parse(stored) : [];
    } catch (e) {
      console.error('Gagal memuat todos:', e);
      todos = [];
    }
  }

  function saveTodos() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(todos));
    } catch (e) {
      console.error('Gagal menyimpan todos:', e);
    }
  }

  function formatDate(dateString) {
    const date = new Date(dateString);
    const now = new Date();
    const diffDays = Math.floor((date - now) / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) return 'Hari ini';
    if (diffDays === 1) return 'Besok';
    if (diffDays === -1) return 'Kemarin';
    
    return date.toLocaleDateString('id-ID', {
      weekday: 'short',
      day: 'numeric',
      month: 'short',
      year: (date.getFullYear() !== now.getFullYear()) ? 'numeric' : undefined
    });
  }

  function isOverdue(todo) {
    if (todo.done || !todo.deadline) return false;
    const now = new Date().setHours(0,0,0,0);
    const deadlineDate = new Date(todo.deadline).setHours(0,0,0,0);
    return deadlineDate < now;
  }

  // Fungsi helper untuk membuat elemen todo
  function createTodoElement(todo) {
    const li = document.createElement('li');
    li.setAttribute('data-id', todo.id);
    li.setAttribute('tabindex', '0');

    // Icon checkbox
    const icon = document.createElement('span');
    icon.setAttribute('role', 'checkbox');
    icon.setAttribute('aria-checked', todo.done ? 'true' : 'false');
    icon.setAttribute('tabindex', '0');
    icon.className = 'material-icons checkbox-icon';
    icon.textContent = todo.done ? 'check_box' : 'check_box_outline_blank';
    if(todo.done) icon.classList.add('checked');
    
    icon.addEventListener('click', () => toggleDone(todo.id));
    icon.addEventListener('keydown', e => {
        if(e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            toggleDone(todo.id);
        }
    });

    // Teks todo
    const textSpan = document.createElement('span');
    textSpan.className = 'todo-text';
    textSpan.textContent = todo.text;
    if(todo.done) textSpan.classList.add('done');
    if(isOverdue(todo)) {
        li.classList.add('overdue');
        textSpan.setAttribute('aria-label', 'Tugas ini sudah terlambat (overdue)');
    }

    // Deadline
    const timeElem = document.createElement('time');
    timeElem.textContent = todo.deadline ? formatDate(todo.deadline) : 'Tanpa deadline';
    timeElem.setAttribute('datetime', todo.deadline ? new Date(todo.deadline).toISOString() : '');

    // Label prioritas
    const prioritySpan = document.createElement('span');
    prioritySpan.className = 'priority ' + todo.priority;
    let priorityText = 'Rendah';
    if(todo.priority === 'medium') priorityText = 'Sedang';
    if(todo.priority === 'high') priorityText = 'Tinggi';
    prioritySpan.textContent = priorityText;
    prioritySpan.setAttribute('aria-label', 'Prioritas: ' + priorityText);

    const deleteBtn = document.createElement('button');
    deleteBtn.className = 'delete-btn material-icons';
    deleteBtn.textContent = 'delete';
    deleteBtn.setAttribute('aria-label', 'Hapus todo');
    deleteBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        deleteTodo(todo.id);
    });

    li.appendChild(icon);
    li.appendChild(textSpan);
    li.appendChild(timeElem);
    li.appendChild(prioritySpan);
    li.appendChild(deleteBtn);

    return li;
  }

  function deleteTodo(id) {
    if(confirm('Apakah Anda yakin ingin menghapus todo ini?')) {
        todos = todos.filter(todo => todo.id !== id);
        saveTodos();
        renderTodos();
    }
  }
  
  function clearAllInSection(sectionType) {
    if(confirm(`Apakah Anda yakin ingin menghapus semua todo di ${sectionType}?`)) {
        if(sectionType === 'overdue') {
            todos = todos.filter(todo => !isOverdue(todo));
        } else if(sectionType === 'pending') {
            todos = todos.filter(todo => todo.done || isOverdue(todo));
        } else if(sectionType === 'done') {
            todos = todos.filter(todo => !todo.done);
        }
        saveTodos();
        renderTodos();
    }
  }

  // Event listener untuk tombol clear
  document.querySelectorAll('.clear-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        const target = e.target.dataset.target;
        if(target === 'todo-overdue') {
            clearAllInSection('overdue');
        } else if(target === 'todo-pending') {
            clearAllInSection('pending');
        } else if(target === 'todo-done') {
            clearAllInSection('done');
        }
    });
  });

  function renderTodos() {
    todoPendingList.innerHTML = '';
    todoDoneList.innerHTML = '';
    todoOverdueList.innerHTML = '';

    if(todos.length === 0) {
        const emptyMsg = document.createElement('p');
        emptyMsg.style.color = '#999';
        emptyMsg.textContent = 'Belum ada To-Do. Silakan buat baru.';
        todoPendingList.appendChild(emptyMsg);
        
        const doneEmptyMsg = document.createElement('p');
        doneEmptyMsg.style.color = '#999';
        doneEmptyMsg.textContent = 'Belum ada To-Do yang selesai.';
        todoDoneList.appendChild(doneEmptyMsg);
        
        overdueSection.style.display = 'none';
        return;
    }

    // Pisahkan todo menjadi 3 kategori
    const overdueTodos = [];
    const pendingTodos = [];
    const doneTodos = [];

    todos.forEach(todo => {
        if (todo.done) {
            doneTodos.push(todo);
        } else if (isOverdue(todo)) {
            overdueTodos.push(todo);
        } else {
            pendingTodos.push(todo);
        }
    });

    // Urutkan masing-masing kategori:
    // - Overdue: yang paling lama terlewat di atas
    overdueTodos.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    // - Pending: yang deadline terdekat di atas
    pendingTodos.sort((a, b) => new Date(a.deadline) - new Date(b.deadline));
    
    // - Done: yang paling baru selesai di atas
    doneTodos.sort((a, b) => b.time - a.time);

    // Render overdue todos
    overdueTodos.forEach(todo => {
        todoOverdueList.appendChild(createTodoElement(todo));
    });

    // Render pending todos
    pendingTodos.forEach(todo => {
        todoPendingList.appendChild(createTodoElement(todo));
    });

    // Render done todos
    doneTodos.forEach(todo => {
        todoDoneList.appendChild(createTodoElement(todo));
    });

    // Tampilkan section overdue jika ada
    overdueSection.style.display = overdueTodos.length > 0 ? 'block' : 'none';
    
    // Pindahkan posisi section overdue ke atas
    if (overdueSection.style.display === 'block') {
        const listsContainer = document.querySelector('.lists-container');
        listsContainer.insertBefore(overdueSection, listsContainer.firstChild);
    }
  }

  function toggleDone(id) {
    const index = todos.findIndex(t => t.id === id);
    if(index < 0) return;

    todos[index].done = !todos[index].done;
    todos[index].time = Date.now(); // Update waktu ketika di-toggle
    saveTodos();
    renderTodos();
  }

  // Form submission handler
  todoForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const text = todoTextarea.value.trim();
    if(text.length === 0) {
      alert('Teks To-Do tidak boleh kosong!');
      return;
    }

    const priority = prioritySelect.value;
    const deadline = deadlineDate.value;

    const newTodo = {
      id: crypto.randomUUID ? crypto.randomUUID() : String(Date.now()),
      text,
      priority,
      done: false,
      time: Date.now(),
      deadline: deadline
    };

    todos.push(newTodo);
    saveTodos();
    renderTodos();

    // Reset form
    todoForm.reset();
    deadlineDate.value = today; // Tetapkan kembali ke hari ini
    todoTextarea.focus();
  });

  deleteAllBtn.addEventListener('click', () => {
    if(confirm('Apakah Anda yakin ingin menghapus seluruh To-Do?')) {
      todos = [];
      saveTodos();
      renderTodos();
    }
  });

  function init() {
    loadTodos();
    renderTodos();
  }

  init();
})();