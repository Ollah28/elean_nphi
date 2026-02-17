async function register() {
    try {
        const response = await fetch('http://localhost:3001/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: 'Test User',
                email: 'ollahtrading254@gmail.com',
                password: 'password123',
            }),
        });

        const data = await response.json();

        if (response.ok) {
            console.log('Registration successful:', data);
        } else {
            console.error('Registration failed:', response.status, data);
        }
    } catch (error: any) {
        console.error('Error:', error.message);
    }
}

register();
