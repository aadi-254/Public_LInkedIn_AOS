import React, { useState, useEffect } from 'react';
import './Taskmanager.css'; // For styling (optional)

const Taskmanager = () => {
  // Initialize tasks from localStorage or use default tasks
  const [tasks, setTasks] = useState(() => {
    const savedTasks = localStorage.getItem('tasks');
    return savedTasks ? JSON.parse(savedTasks) : [
      { id: 1, title: 'The Best Coding Channel', description: 'I have to create my channel in Hindi for those who do not understand English properly.', completed: false },
      { id: 2, title: 'CPP Concepts', description: 'I need to clear the basics of C++ like Abstraction, Inheritance, Polymorphism, etc.', completed: true },
      { id: 3, title: 'Assignment', description: 'My assignment is on 20th March. I have to complete it.', completed: false },
      { id: 4, title: 'Projects', description: 'I need to see tutorials of The Code Master YouTube channel.', completed: false },
    ];
  });

  const [filter, setFilter] = useState('All');
  const [newTask, setNewTask] = useState({ title: '', description: '' }); // For the Add Task form

  // Save tasks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem('tasks', JSON.stringify(tasks));
  }, [tasks]);

  const filteredTasks = tasks.filter(task => {
    if (filter === 'Completed') return task.completed;
    if (filter === 'Incomplete') return !task.completed;
    return true; // All tasks
  });

  const handleFilterChange = (newFilter) => {
    setFilter(newFilter);
  };

  const toggleTaskCompletion = (id) => {
    setTasks(tasks.map(task => (task.id === id ? { ...task, completed: !task.completed } : task)));
  };

  const deleteTask = (id) => {
    setTasks(tasks.filter(task => task.id !== id));
  };

  const handleAddTask = () => {
    if (newTask.title.trim() === '' || newTask.description.trim() === '') {
      alert('Please provide both a title and description for the task.');
      return;
    }
    const newTaskEntry = {
      id: tasks.length ? tasks[tasks.length - 1].id + 1 : 1, // Generate a new ID
      title: newTask.title,
      description: newTask.description,
      completed: false,
    };
    setTasks([...tasks, newTaskEntry]); // Add the new task
    setNewTask({ title: '', description: '' }); // Reset the input fields
  };

  return (
    <div className="task-manager">
      {/* Left Sidebar */}
      <div className="sidebar">
        <h3>Created By</h3>
        <p>Aditya Makwana</p>
        <ul>
          <li onClick={() => handleFilterChange('All')} className={filter === 'All' ? 'active' : ''}>All Tasks</li>
          <li onClick={() => handleFilterChange('Important')} className={filter === 'Important' ? 'active' : ''}>Important Tasks</li>
          <li onClick={() => handleFilterChange('Completed')} className={filter === 'Completed' ? 'active' : ''}>Completed Tasks</li>
          <li onClick={() => handleFilterChange('Incomplete')} className={filter === 'Incomplete' ? 'active' : ''}>Incomplete Tasks</li>
        </ul>
      </div>

      {/* Main Section */}
      <div className="main-content">
        <div className="tasks-container">
          {filteredTasks.map(task => (
            <div key={task.id} className={`task-card ${task.completed ? 'completed' : 'incomplete'}`}>
              <h3>{task.title}</h3>
              <p>{task.description}</p>
              <div className="task-actions">
                <button className={task.completed ? 'mark-incomplete' : 'mark-complete'} onClick={() => toggleTaskCompletion(task.id)}>
                  {task.completed ? 'Incomplete' : 'Complete'}
                </button>
                <button className="edit-task">✏️</button>
                <button className="delete-task" onClick={() => deleteTask(task.id)}>🗑️</button>
              </div>
            </div>
          ))}
          <div className="task-card add-task">
            <h5>Add New Task</h5>
            <input
              type="text"
              placeholder="Task Title"
              value={newTask.title}
              onChange={(e) => setNewTask({ ...newTask, title: e.target.value })}
            />
            <textarea
              placeholder="Task Description"
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
            />
            <button className="add-task-button" onClick={handleAddTask}>Add Task</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Taskmanager;
