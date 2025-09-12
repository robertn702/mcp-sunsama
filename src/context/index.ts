// Singleton context for application session data
export interface SessionData {
    [key: string]: any;
}

class Context {
    public session: SessionData = {};
}

const context = new Context();
export default context;
