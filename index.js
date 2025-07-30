// 1. Todo Schema
const todoSchema = {
  title: 'todo schema',
  version: 0,
  primaryKey: 'id',
  type: 'object',
  properties: {
    id: {
      type: 'string',
      maxLength: 100 // Add maxLength for performance
    },
    text: {
      type: 'string'
    },
    createdAt: {
      type: 'number',
      index: true // Create an index on createdAt for faster sorting
    }
  },
  required: ['id', 'text', 'createdAt']
};

// 2. Global Variables
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


// 4. Render Logic (now driven by RxDB subscription)
const renderTodos = (todos) => {
  const todoList = document.getElementById('todo-list');
  todoList.innerHTML = '';

  if (todos.length === 0) {
    todoList.innerHTML = `<div class="empty-state">No todos yet. Add one above!</div>`;
    return;
  }

  todos.forEach(todoDoc => {
    const todo = todoDoc.toJSON(); // Get plain JS object from RxDocument
    const li = document.createElement('li');
    li.dataset.id = todo.id;

    const todoTextSpan = document.createElement('span');
    todoTextSpan.textContent = todo.text;
    todoTextSpan.className = 'todo-text';

    const buttonContainer = document.createElement('div');
    const editButton = document.createElement('button');
    editButton.textContent = 'Edit';
    editButton.className = 'edit-btn';
    
    const deleteButton = document.createElement('button');
    deleteButton.textContent = 'Delete';
    deleteButton.className = 'delete-btn';

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
          // Use patch for efficient updates
          await todoDoc.patch({ text: newText });
        } else {
          renderTodos(db.todos.find().exec().then(docs => docs)); // Re-render to cancel
        }
      };

      saveButton.onclick = saveAction;
      editInput.onkeydown = (e) => {
        if (e.key === 'Enter') saveAction();
        if (e.key === 'Escape') renderTodos(db.todos.find().exec().then(docs => docs));
      };

      li.appendChild(editInput);
      li.appendChild(saveButton);
      editInput.focus();
    };

    // Delete functionality
    deleteButton.onclick = () => {
      showDeleteModal(`Are you sure you want to delete "${todo.text}"?`, async () => {
        await todoDoc.remove();
      });
    };

    li.appendChild(todoTextSpan);
    buttonContainer.appendChild(editButton);
    buttonContainer.appendChild(deleteButton);
    li.appendChild(buttonContainer);
    todoList.appendChild(li);
  });
};


// 5. App Initialization
const main = async () => {
  // Create the RxDB database
  db = await RxDB.createRxDatabase({
    name: 'todolistdb',
    storage: RxDB.getRxStoragePouch('idb') // Specify IndexedDB adapter
  });

  // Create the 'todos' collection
  await db.addCollections({
    todos: {
      schema: todoSchema
    }
  });

  // Subscribe to the query.
  // This will re-run renderTodos() whenever the result set changes.
  db.todos.find({
    sort: [{ createdAt: 'asc' }]
  }).$.subscribe(todos => {
    if (!todos) return;
    renderTodos(todos);
  });

  // Set up UI event listeners
  const addTodoBtn = document.getElementById('add-todo-btn');
  const todoInput = document.getElementById('todo-input');

  const addNewTodo = async () => {
    const todoText = todoInput.value.trim();
    if (todoText) {
      await db.todos.insert({
        id: new Date().getTime().toString(), // Simple unique ID
        text: todoText,
        createdAt: new Date().getTime()
      });
      todoInput.value = '';
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