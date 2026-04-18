import { test, expect } from '@playwright/test';

test.describe('Social Features', () => {
  test('friending and room creation flow', async ({ page }) => {
    await page.goto('http://localhost:5173/FriendChat/');
    
    // Login
    await page.fill('input[placeholder="..."]', 'UserA');
    await page.click('button:has-text("Start Chatting")');
    
    // Create Private Room
    await page.click('text=Create Room');
    await page.fill('input[placeholder="..."] >> nth=0', 'PrivateRoomA');
    await page.click('button:has-text("Start")');
    
    // Verify room
    await expect(page.getByText('PRIVATE ROOM A')).toBeVisible();
    
    // Check for "Friends" tab
    await page.click('text=Friends');
    await expect(page.getByText('Friends List')).toBeVisible();
  });
});
