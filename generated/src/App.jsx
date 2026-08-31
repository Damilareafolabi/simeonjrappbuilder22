import React, { useState } from 'react';
import './App.css';

function App() {
    const [customers, setCustomers] = useState([]);
    const [contacts, setContacts] = useState([]);

    return (
        <div className="App">
            <h1>CRM</h1>
            {/* Add your CRM components here */}
        </div>
    );
}

export default App;