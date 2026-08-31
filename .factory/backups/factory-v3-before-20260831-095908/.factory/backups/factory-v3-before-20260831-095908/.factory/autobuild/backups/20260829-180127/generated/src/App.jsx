import React, { useState } from 'react';
import './App.css';

function App() {
    const [tasks, setTasks] = useState([]);
    const [filter, setFilter] = useState('all');

    const addTask = (task) => {
        setTasks([...tasks, task]);
    };

    const filterTasks = () => {
        if (filter === 'completed') {
            return tasks.filter(task => task.completed);
        } else if (filter === 'pending') {
            return tasks.filter(task => !task.completed);
        }
        return tasks;
    };

    return (
        <div className="App">
            <h1>Task Manager</h1>
            <input type="text" placeholder="Add a new task" onKeyPress={(e) => e.key === 'Enter' && addTask(e.target.value)} />
            <button onClick={() => setFilter('completed')}>Completed</button>
            <button onClick={() => setFilter('pending')}>Pending</button>
            <div className="tasks">
                {filterTasks().map((task, index) => (
                    <div key={index} className={`task ${task.completed ? 'completed' : ''}`}>
                        <h2>{task.title}</h2>
                        <p>Status: {task.completed ? 'Completed' : 'Pending'}</p>
                    </div>
                ))}
            </div>
        </div>
    );
}

export default App;