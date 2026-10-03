const request = require('supertest');
const app = require('../index');
const jwt = require('jsonwebtoken');

describe('Citizen Endpoints', () => {
    let token;

    beforeAll(() => {
        token = jwt.sign({ id: 1, role: 'citizen', name: 'John Citizen' }, 'supersecretkey');
    });

    it('should create a pickup request and auto-create point if none nearby', async () => {
        const res = await request(app)
            .post('/api/citizen/requests')
            .set('Authorization', `Bearer ${token}`)
            .send({
                lat: 40.7128,
                lng: -74.0060,
                address: '123 Fake St',
                waste_type: 'General',
                quantity_kg: 10
            });
        
        expect(res.statusCode).toBe(200);
        expect(res.body.success).toBe(true);
        expect(res.body.request_id).toBeDefined();
    });

    it('should fetch user requests', async () => {
        const res = await request(app)
            .get('/api/citizen/requests')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });

    it('should fetch citizen profile with points', async () => {
        const res = await request(app)
            .get('/api/citizen/profile')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(res.body.eco_points).toBeDefined();
        expect(res.body.level).toBeDefined();
    });

    it('should fetch eco points ledger', async () => {
        const res = await request(app)
            .get('/api/citizen/ledger')
            .set('Authorization', `Bearer ${token}`);
        
        expect(res.statusCode).toBe(200);
        expect(Array.isArray(res.body)).toBe(true);
    });
});
