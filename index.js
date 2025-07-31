let db;

// 3. Helper functions for Modal
const showDeleteModal = (message, onConfirm) => {
  const modal = document.getElementById('delete-modal');
  const modalText = document.getElementById('modal-text');
  const confirmBtn = document.getElementById('confirm-delete-btn');
  const cancelBtn = document.getElementById('cancel-delete-btn');
  
  modalText.textContent = message;
  modal.style.display = 'flex';

  const confirmHandler = () => {
    onConfirm();
    hideDeleteModal();
  };

  const cancelHandler = () => {
    hideDeleteModal();
  };
  
  // Use cloneNode to remove old event listeners
  const newConfirmBtn = confirmBtn.cloneNode(true);
  confirmBtn.parentNode.replaceChild(newConfirmBtn, confirmBtn);
  newConfirmBtn.onclick = confirmHandler;

  const newCancelBtn = cancelBtn.cloneNode(true);
  cancelBtn.parentNode.replaceChild(newCancelBtn, cancelBtn);
  newCancelBtn.onclick = cancelHandler;
};

const hideDeleteModal = () => {
  document.getElementById('delete-modal').style.display = 'none';
};


const renderTodos = async (todos) => {
  const todoList = document.getElementById('todo-list');
  todoList.innerHTML = '';

  if (todos.length === 0) {
    todoList.innerHTML = `<div class="empty-state">No todos yet. Add one above!</div>`;
    return;
  }

  for (const todo of todos) {
    const li = document.createElement('li');
    li.dataset.id = todo.id;
    
    // Add completed class if todo is completed
    if (todo.completed) {
      li.classList.add('todo-completed');
    }

    const todoTextSpan = document.createElement('span');
    todoTextSpan.textContent = todo.text;
    todoTextSpan.className = 'todo-text';

    const buttonContainer = document.createElement('div');
    
    // Done/Undone button
    const doneButton = document.createElement('button');
    doneButton.textContent = todo.completed ? 'Undone' : 'Done';
    doneButton.className = todo.completed ? 'undone-btn' : 'done-btn';
    
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'edit-btn';
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-btn';

    // Done/Undone functionality
    doneButton.onclick = async () => {
      await db.todos.update(todo.id, {
        completed: !todo.completed,
        updatedAt: new Date().toISOString()
      });
      await loadAndRenderTodos();
    };

    // Edit functionality
    editButton.onclick = () => {
      li.innerHTML = '';
      const editInput = document.createElement('input');
      editInput.type = 'text';
      editInput.value = todo.text;
      editInput.className = 'edit-input';
      
      const saveButton = document.createElement('button');
      saveButton.textContent = 'Save';
      saveButton.className = 'edit-btn';

      const saveAction = async () => {
        const newText = editInput.value.trim();
        if (newText && newText !== todo.text) {
          await db.todos.update(todo.id, {
            text: newText,
            updatedAt: new Date().toISOString()
          });
        }
        await loadAndRenderTodos();
      };

      saveButton.onclick = saveAction;
      editInput.onkeydown = (e) => {
        if (e.key === 'Enter') saveAction();
        if (e.key === 'Escape') loadAndRenderTodos();
      };

      li.appendChild(editInput);
      li.appendChild(saveButton);
      editInput.focus();
    };

    // Delete functionality
    deleteButton.onclick = () => {
      showDeleteModal(`Are you sure you want to delete "${todo.text}"?`, async () => {
        await db.todos.delete(todo.id);
        await loadAndRenderTodos();
      });
    };

    li.appendChild(todoTextSpan);
    buttonContainer.appendChild(doneButton);
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    li.appendChild(buttonContainer);
    todoList.appendChild(li);
  }
};


// Helper function to load and render todos
const loadAndRenderTodos = async () => {
  const todos = await db.todos.orderBy('createdAt').toArray();
  await renderTodos(todos);
};

// App Initialization
const main = async () => {
  db = new Dexie("todolist-database");

  db.version(1).stores({
    todos: 'id, text, createdAt, completed'
  });

  // Load and render initial todos
  await loadAndRenderTodos();

  // Set up UI event listeners
  const addTodoBtn = document.getElementById('add-todo-btn');
  const todoInput = document.getElementById('todo-input');

  const addNewTodo = async () => {
    const todoText = todoInput.value.trim();
    if (todoText) {
      const newTodo = {
        id: Date.now().toString(),
        text: todoText,
        completed: false,
        createdAt: new Date().toISOString()
      };
      await db.todos.add(newTodo);
      todoInput.value = '';
      await loadAndRenderTodos();
    }
  };

  addTodoBtn.onclick = addNewTodo;
  todoInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      addNewTodo();
    }
  });
};

window.onload = main;
