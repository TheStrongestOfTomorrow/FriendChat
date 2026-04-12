import { test, expect } from '@playwright/test';

test('verify landing and lobby', async ({ page }) => {
  await page.goto('http://localhost:5173/FriendChat/');

  // Enter name and start - The button has ShieldCheck icon and text "Start Chatting"
  await page.fill('input[placeholder="..."]', 'Tester');
  await page.click('button:has-text("Start Chatting")');

  // Verify Lobby header
  await expect(page.getByText('FriendChat', { exact: true })).toBeVisible();

  // Click "Create Room"
  await page.click('button:has-text("Create Room")');

  // Fill room name
  await page.fill('input[placeholder="..."] >> nth=0', 'Playwright Room');

  // Submit room creation (Start button in the modal)
  await page.click('button:has-text("Start")');

  // Verify inside chat room
  await expect(page.getByText('PLAYWRIGHT ROOM')).toBeVisible();

  // Send a message
  await page.fill('input[placeholder="Type a message..."]', 'Automated Test Message');
  // Send button is a microphone icon initially, but changes to send icon if we type.
  // Actually, in our ChatRoom.tsx, the button is a button with a Send or Mic icon.
  // Let's press Enter to send instead.
  await page.keyboard.press('Enter');

  // Verify message
  await expect(page.getByText('Automated Test Message')).toBeVisible();

  // Take screenshot
  await page.screenshot({ path: 'screenshots/chat-verified.png' });
});
