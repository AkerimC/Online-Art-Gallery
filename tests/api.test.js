const request = require('supertest');
const app = require('../server');

describe('Online Art Gallery - 16 Requirement Tests', () => {

    // 1. Eserleri İnceleme
    it('M1: should fetch artwork details and artist info', async () => {
        const res = await request(app).get('/api/artworks');
        expect(res.statusCode).toEqual(200);
        expect(res.body[0]).toHaveProperty('artist');
        expect(res.body[0]).toHaveProperty('image');
    });

    // 2. Atölye ve Etkinlikleri Görüntüleme
    it('M2: should list workshops with date, price and capacity', async () => {
        const res = await request(app).get('/api/workshops');
        expect(res.statusCode).toEqual(200);
        expect(res.body[0]).toHaveProperty('capacity');
        expect(res.body[0]).toHaveProperty('booked');
    });

    // 3. Favorilere Ekleme
    it('M3: should add and remove favorites', async () => {
        const userId = 1;
        const artworkId = 1;
        // Add
        await request(app).post('/api/favorites').send({ user_id: userId, artwork_id: artworkId });
        const res = await request(app).get(`/api/favorites/${userId}`);
        expect(res.body).toContain(artworkId);
        // Remove
        await request(app).delete(`/api/favorites/${userId}/${artworkId}`);
        const res2 = await request(app).get(`/api/favorites/${userId}`);
        expect(res2.body).not.toContain(artworkId);
    });

    // 4. Rezervasyon Oluşturma
    it('M4: should create a workshop reservation', async () => {
        const res = await request(app).post('/api/reservations').send({
            user_id: 1, workshop_id: 1, title: 'Test Workshop',
            date: '2026-01-01', time: '10:00', participants: 2, total: 200
        });
        expect(res.statusCode).toEqual(200);
        expect(res.body.success).toBeTruthy();
    });

    // 5. Rezervasyonu Güncelleme
    it('M5: should update and cancel reservation', async () => {
        // Assume reservation ID 1 exists from previous test (or seed)
        const updateRes = await request(app).put('/api/reservations/1').send({
            participants: 3, total: 300, date: '2026-01-02', time: '11:00'
        });
        expect(updateRes.statusCode).toEqual(200);

        const cancelRes = await request(app).put('/api/reservations/cancel/1');
        expect(cancelRes.statusCode).toEqual(200);
    });

    // 6. Satın Alma ve Ödeme İşlemleri
    it('M6: should require payment method for orders', async () => {
        const res = await request(app).post('/api/orders').send({
            user_id: 1, total: 500, items: [], payment_method: 'Credit Card'
        });
        expect(res.statusCode).toEqual(200);
        const orders = await request(app).get('/api/orders/1');
        expect(orders.body[0]).toHaveProperty('payment_method'); // FAIL BEKLENİYOR
    });

    // 7. Hesap Yönetimi
    it('M7: should update profile and change password', async () => {
        const profileRes = await request(app).put('/api/users/1').send({ name: 'Updated Name', email: 'admin@aura.com' });
        expect(profileRes.statusCode).toEqual(200);

        const passRes = await request(app).put('/api/users/1/password').send({
            currentPassword: 'admin123', newPassword: 'newpassword123'
        });
        expect(passRes.statusCode).toEqual(200);
    });

    // 8. Sipariş ve Rezervasyon Takibi
    it('M8: should track order and reservation status', async () => {
        const orders = await request(app).get('/api/orders/1');
        expect(orders.body[0]).toHaveProperty('status');
        const reservations = await request(app).get('/api/reservations/1');
        expect(reservations.body[0]).toHaveProperty('status');
    });

    // 9. İndirim ve Kampanyalar
    it('M9: should apply coupon and list campaigns', async () => {
        const res = await request(app).post('/api/coupons/validate').send({ code: 'AURA20' });
        expect(res.body.discount).toEqual(20);

        // Kampanyalı ürünleri listeleme API'si henüz yok
        const campaignRes = await request(app).get('/api/artworks/campaigns');
        expect(campaignRes.statusCode).toEqual(200); // FAIL BEKLENİYOR
    });

    // 10. Müşteri Destek
    it('M10: should submit support ticket and view status', async () => {
        const res = await request(app).post('/api/tickets').send({
            user_id: 1, subject: 'Help', message: 'I need help'
        });
        expect(res.statusCode).toEqual(200);
        const tickets = await request(app).get('/api/tickets/user/1');
        expect(tickets.body[0]).toHaveProperty('status');
    });

    // 11. Eser ve Etkinlik Karşılaştırma
    it('M11: should save item comparisons', async () => {
        const res = await request(app).post('/api/comparisons').send({
            user_id: 1, type: 'artwork', item_ids: [1, 2]
        });
        expect(res.statusCode).toEqual(200);
    });

    // 12. Yorum Ekleme
    it('M12: should allow adding comments to artworks and workshops', async () => {
        const res = await request(app).post('/api/comments').send({
            refId: 1, type: 'artwork', user_id: 1, user_name: 'Admin', text: 'Great!', rating: 5
        });
        expect(res.statusCode).toEqual(200);
    });

    // 13. Yorumları Değerlendirme ve Filtreleme
    it('M13: should calculate average rating and filter comments', async () => {
        // Ortalama puan API'si henüz yok
        const res = await request(app).get('/api/artworks/1/rating');
        expect(res.body).toHaveProperty('average'); // FAIL BEKLENİYOR
        
        // Filtreleme testi
        const filterRes = await request(app).get('/api/comments/artwork/1?sort=highest');
        expect(filterRes.body[0].rating).toBeGreaterThanOrEqual(filterRes.body[1].rating); // FAIL BEKLENİYOR
    });

    // 14. Yorumlara Yanıt Verme
    it('M14: should allow admin to reply to comments', async () => {
        const res = await request(app).post('/api/comments/1/reply').send({ reply: 'Thank you!' });
        expect(res.statusCode).toEqual(200);
    });

    // 15. Doğrulama ve Güvenilirlik
    it('M15: should only allow comments from verified buyers/participants', async () => {
        const res = await request(app).post('/api/comments').send({
            refId: 2, type: 'artwork', user_id: 1, text: 'Fake review', rating: 1
        });
        // User 1 hasn't bought artwork 2, should be forbidden
        expect(res.statusCode).toEqual(403); // FAIL BEKLENİYOR
    });

    // 16. İstatistik ve Raporlama
    it('M16: should track views and show full admin reports', async () => {
        const stats = await request(app).get('/api/admin/reports');
        expect(stats.body).toHaveProperty('artwork_stats');
        expect(stats.body).toHaveProperty('workshop_stats'); // FAIL BEKLENİYOR
    });
});
