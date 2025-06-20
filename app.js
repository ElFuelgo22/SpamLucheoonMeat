class imissyou {
    constructor() {
        // config.js
        this.emailjsConfig = window.CONFIG.emailjs;
        this.recipientEmail = window.CONFIG.recipient.email;
        
        // storage
        this.storageKeys = {
            lastInteraction: 'missingu_last_interaction',
            nextReminderTime: 'missingu_next_reminder',
            emailSent: 'missingu_email_sent'
        };
        
        // main elements
        this.elements = {
            statusMessage: document.getElementById('status-message'),
            checkInBtn: document.getElementById('check-in-btn'),
            testEmailBtn: document.getElementById('test-email-btn'),
            lastInteraction: document.getElementById('last-interaction'),
            nextCheckTime: document.getElementById('next-check-time')
        };
        
        this.init();
    }
    
    init() {
        // emailjs initialization
        emailjs.init(this.emailjsConfig.publicKey);
        
        // event listeners
        this.bindEvents();
        
        // ui updates
        this.updateUI();
        
        // Start the background checker
        this.startBackgroundChecker();
        
        console.log('Missing You app initialized');
    }
    
    bindEvents() {
        this.elements.checkInBtn.addEventListener('click', () => this.checkIn());
        this.elements.testEmailBtn.addEventListener('click', () => this.sendTestEmail());
    }
    
    checkIn() {
        const now = Date.now();
        
        localStorage.setItem(this.storageKeys.lastInteraction, now.toString());
        const nextReminderTime = this.generateNextReminderTime();
        localStorage.setItem(this.storageKeys.nextReminderTime, nextReminderTime.toString());
        
        // Clear any previous email sent flag
        localStorage.removeItem(this.storageKeys.emailSent);
        this.updateUI();
        
        // success message
        this.showMessage('Checked in successfully! Timer reset.', 'success');
        
        // animation
        const heartIcon = document.querySelector('svg');
        heartIcon.classList.add('heart-beat');
        setTimeout(() => heartIcon.classList.remove('heart-beat'), 1500);
        
        console.log('Check-in recorded:', new Date(now));
    }
    
    generateNextReminderTime() {
        try {
            // randomizer
            const minDays = 3;
            const maxDays = 5;
            const randomDays = Math.random() * (maxDays - minDays) + minDays;
            const millisecondsPerDay = 24 * 60 * 60 * 1000;
            
            return Date.now() + (randomDays * millisecondsPerDay);
        } 
        catch (error) {
            console.error('Error generating next reminder time:', error);
            // 4 days if the error occurs
            return Date.now() + (4 * 24 * 60 * 60 * 1000);
        }
    }
    
    updateUI() {
        const lastInteractionTime = localStorage.getItem(this.storageKeys.lastInteraction);
        const nextReminderTime = localStorage.getItem(this.storageKeys.nextReminderTime);
        
        if (lastInteractionTime) {
            const date = new Date(parseInt(lastInteractionTime));
            this.elements.lastInteraction.textContent = this.formatRelativeTime(date);
        } 
        else {
            this.elements.lastInteraction.textContent = 'Never';
        }

        if (nextReminderTime) {
            const date = new Date(parseInt(nextReminderTime));
            this.elements.nextCheckTime.textContent = this.formatRelativeTime(date);
        } 
        else {
            this.elements.nextCheckTime.textContent = 'Not scheduled';
        }
        
        this.updateStatusMessage();
    }
    
    updateStatusMessage() {
        try {
            const lastInteractionTime = localStorage.getItem(this.storageKeys.lastInteraction);
            const nextReminderTime = localStorage.getItem(this.storageKeys.nextReminderTime);
            const now = Date.now();
            
            if (!lastInteractionTime) {
                this.showMessage('Welcome! Click "Check In" to start tracking.', 'info');
                return;
            }
            
            const daysSinceLastInteraction = (now - parseInt(lastInteractionTime)) / (24 * 60 * 60 * 1000);
            
            if (daysSinceLastInteraction < 1) {
                this.showMessage('You checked in recently. All good!', 'success');
            } 
            else if (daysSinceLastInteraction < 3) {
                this.showMessage(`It's been ${Math.floor(daysSinceLastInteraction)} day(s). Still within range!`, 'info');
            } 
            else {
                this.showMessage(`It's been ${Math.floor(daysSinceLastInteraction)} day(s) since your last check-in. Missing you!`, 'warning');
            }
        } 
        catch (error) {
            console.error('Error updating status message:', error);
            this.showMessage('Something went wrong. Please check the console for details.', 'danger');
        }
    }
    
    // initializes the background checker that runs every hour hehe
    startBackgroundChecker() {
        try {
            setInterval(() => {
                try {
                    this.checkIfReminderNeeded();
                    this.updateUI();
                } 
                catch (error) {
                    console.error('Error in background checker interval:', error);
                }
            }, 60 * 60 * 1000);
            
            this.checkIfReminderNeeded();
        } 
        catch (error) {
            console.error('Error starting background checker:', error);
        }
    }
    
    // checks if a reminder email needs to be sent or not
    // if the next reminder time is reached, it sends an email
    checkIfReminderNeeded() {
        try {
            const lastInteractionTime = localStorage.getItem(this.storageKeys.lastInteraction);
            const nextReminderTime = localStorage.getItem(this.storageKeys.nextReminderTime);
            const emailSent = localStorage.getItem(this.storageKeys.emailSent);
            const now = Date.now();
            
            if (!lastInteractionTime || !nextReminderTime || emailSent) {
                return;
            }
            
            try {
                if (now >= parseInt(nextReminderTime)) {
                    this.sendReminderEmail();
                }
            } 
            catch (error) {
                console.error('Error parsing next reminder time:', error);
                // reset corrupted reminder time
                localStorage.removeItem(this.storageKeys.nextReminderTime);
                this.showMessage('Reminder time was corrupted. Resetting to a new reminder.', 'warning');
                // generate a new reminder time
                const newReminderTime = this.generateNextReminderTime();
                localStorage.setItem(this.storageKeys.nextReminderTime, newReminderTime.toString());
            }
        } 
        catch (error) {
            console.error('Error checking if reminder is needed:', error);
        }
    }
    
    async sendReminderEmail() {
        try {
            const lastInteractionTime = parseInt(localStorage.getItem(this.storageKeys.lastInteraction));
            const daysSince = Math.floor((Date.now() - lastInteractionTime) / (24 * 60 * 60 * 1000));
            
            const message = this.generateSweetMessage(daysSince);
            
            const templateParams = {
                to_email: this.recipientEmail,
                to_name: window.CONFIG.recipient.name,
                message: message,
                days_since: daysSince,
                from_name: 'Your Missing You App'
            };
            
            await emailjs.send(this.emailjsConfig.serviceId, this.emailjsConfig.templateId, templateParams);
            
            localStorage.setItem(this.storageKeys.emailSent, Date.now().toString());
            
            console.log('Reminder email sent successfully');
            this.showMessage('Reminder email sent to Mary!', 'success');
            
        } 
        catch (error) {
            console.error('Failed to send reminder email:', error);
            this.showMessage('Failed to send reminder email. Please try again later.', 'danger');
        }
    }
    
    async sendTestEmail() {
        this.elements.testEmailBtn.disabled = true;
        this.elements.testEmailBtn.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Sending...';
        
        try {
            const message = "This is a test message from your Missing You app!\n\nIf you received this, everything is working perfectly. The app will automatically send sweet reminders when we haven't connected for a while.\n\nWith love,\nAdriaan Dimate";
            
            const templateParams = {
                to_email: this.recipientEmail,
                to_name: window.CONFIG.recipient.name,
                message: message,
                from_name: 'Your Missing You App (Test)'
            };
            
            await emailjs.send(this.emailjsConfig.serviceId, this.emailjsConfig.templateId, templateParams);
            
            this.showMessage('Test email sent successfully! Check your inbox.', 'success');
            
        } 
        catch (error) {
            console.error('Failed to send test email:', error);
            this.showMessage('Failed to send test email. Please check your EmailJS configuration.', 'danger');
        } 
        finally {
            this.elements.testEmailBtn.disabled = false;
            this.elements.testEmailBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" class="me-2">
                    <path d="M3 8l7.89 4.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Test Email
            `;
        }
    }
    
    generateSweetMessage(daysSince) {
        const messages = [
            `Hey beautiful Mary!\n\nIt's been ${daysSince} day${daysSince > 1 ? 's' : ''} since we last connected, and I just wanted you to know that I'm thinking about you.\n\nYour smile lights up my world, and every moment without hearing from you feels like forever. I hope you're doing amazing and taking care of yourself.\n\nI miss your laugh, your stories, and just... you. You make everything better just by being you.\n\nCan't wait to connect again soon!\n\nWith all my love,\nSomeone who cares about you deeply`,
            
            `My dearest Mary,\n\n${daysSince} day${daysSince > 1 ? 's' : ''} have passed, and you've been on my mind constantly. I find myself wondering what you're up to, hoping you're happy and healthy.\n\nYou have this incredible way of making the ordinary feel extraordinary, and I miss that magic you bring to everything.\n\nI miss our conversations, your insights, and the way you make me feel like the best version of myself. Distance may keep us apart, but you're always close to my heart.\n\nThinking of you always,\n\nYour devoted admirer`,
            
            `Sweet Mary,\n\nTime feels different when we're not in touch. It's been ${daysSince} day${daysSince > 1 ? 's' : ''}, and I wanted to reach out to tell you how much you mean to me.\n\nYou're like sunshine on a cloudy day - bright, warm, and absolutely essential. I miss the way you see the world, your kindness, and the joy you bring to every interaction.\n\nI hope life is treating you wonderfully because you deserve all the happiness in the world. You're special, Mary, and I'm grateful to know you.\n\nMissing you more than words can say,\n\nWith love and warm thoughts`
        ];
        
        return messages[Math.floor(Math.random() * messages.length)];
    }
    
    showMessage(text, type = 'info') {
        try {
            this.elements.statusMessage.className = `alert alert-${type} mb-4`;
            this.elements.statusMessage.innerHTML = `<p class="mb-0">${text}</p>`;
        } 
        catch (error) {
            console.error('Error displaying message:', error);
        }
    }
    


    formatRelativeTime(date) {
        try {
            const now = new Date();
            const diffInSeconds = Math.floor((now - date) / 1000);
            
            if (diffInSeconds < 60) {
                return 'Just now';
            } 
            else if (diffInSeconds < 3600) {
                const minutes = Math.floor(diffInSeconds / 60);
                return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
            } 
            else if (diffInSeconds < 86400) {
                const hours = Math.floor(diffInSeconds / 3600);
                return `${hours} hour${hours > 1 ? 's' : ''} ago`;
            } 
            else {
                const days = Math.floor(diffInSeconds / 86400);
                if (days < 7) {
                    return `${days} day${days > 1 ? 's' : ''} ago`;
                } 
                else {
                    return date.toLocaleDateString();
                }
            }
        } 
        catch (error) {
            console.error('Error formatting relative time:', error);
            return 'Unknown time';
        }
    }
}

document.addEventListener('DOMContentLoaded', () => {
    new imissyou();
});