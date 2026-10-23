import { expect, test, type Page } from '@playwright/test'

const PASSWORD = 'password123'

async function signUp(page: Page, email: string) {
  await page.goto('/')
  await page.getByRole('button', { name: /create an account/i }).click()
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Register', exact: true }).click()
  await expect(page.getByRole('heading', { name: /Showroom/ })).toBeVisible()
}

async function logIn(page: Page, email: string) {
  await page.goto('/')
  await page.getByLabel('Email').fill(email)
  await page.getByLabel('Password').fill(PASSWORD)
  await page.getByRole('button', { name: 'Log in', exact: true }).click()
  await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
}

const card = (page: Page, name: string) => page.locator('article', { hasText: name })

test.describe.serial('dealership journey', () => {
  test('the first account is the admin and can add vehicles', async ({ page }) => {
    await signUp(page, 'boss@showroom.test')
    await expect(page.getByText('admin', { exact: true })).toBeVisible()

    for (const [make, model, category, price, quantity] of [
      ['Honda', 'Civic', 'Sedan', '22000', '1'],
      ['Ford', 'F-150', 'Truck', '45000', '4'],
    ]) {
      await page.getByRole('button', { name: 'Add vehicle' }).click()
      const form = page.getByRole('dialog', { name: 'Add vehicle' })
      await form.getByLabel('Make').fill(make)
      await form.getByLabel('Model').fill(model)
      await form.getByLabel('Category').fill(category)
      await form.getByLabel('Price').fill(price)
      await form.getByLabel('Quantity').fill(quantity)
      await form.getByRole('button', { name: 'Save' }).click()
      await expect(card(page, `${make} ${model}`)).toBeVisible()
    }
  })

  test('a shopper cannot see admin tools, can search, and buying the last car sells it out', async ({ page }) => {
    await signUp(page, 'shopper@showroom.test')
    await expect(page.getByRole('button', { name: 'Add vehicle' })).toHaveCount(0)
    await expect(card(page, 'Honda Civic').getByRole('button', { name: 'Edit' })).toHaveCount(0)

    // search is debounced and mirrored in the URL
    await page.getByLabel('Filter by make').fill('ford')
    await expect(card(page, 'Honda Civic')).toHaveCount(0)
    await expect(card(page, 'Ford F-150')).toBeVisible()
    await expect(page).toHaveURL(/make=ford/)
    await page.getByRole('button', { name: 'Clear' }).click()

    const civic = card(page, 'Honda Civic')
    await expect(civic).toContainText('Only 1 left')
    await civic.getByRole('button', { name: 'Purchase' }).click()
    await expect(page.getByRole('status')).toContainText('Purchased Honda Civic')
    await expect(civic).toContainText('Sold out')
    await expect(civic.getByRole('button', { name: 'Purchase' })).toBeDisabled()
  })

  test('the admin sees the sale in the audit trail and can restock and delete', async ({ page }) => {
    await logIn(page, 'boss@showroom.test')
    await expect(card(page, 'Honda Civic')).toContainText('Sold out')

    await page.getByRole('button', { name: 'Activity' }).click()
    await expect(page.getByRole('dialog', { name: 'Recent activity' })).toContainText('shopper@showroom.test bought 1 × Honda Civic')
    await page.keyboard.press('Escape')

    await card(page, 'Honda Civic').getByRole('button', { name: 'Restock +5' }).click()
    await expect(card(page, 'Honda Civic')).toContainText('Only 5 left')

    await card(page, 'Ford F-150').getByRole('button', { name: 'Delete' }).click()
    await page.getByRole('alertdialog').getByRole('button', { name: 'Delete' }).click()
    await expect(card(page, 'Ford F-150')).toHaveCount(0)
  })

  test('sessions survive a reload and logging out returns to the login form', async ({ page }) => {
    await logIn(page, 'shopper@showroom.test')
    await page.reload()
    await expect(page.getByRole('button', { name: 'Log out' })).toBeVisible()
    await page.getByRole('button', { name: 'Log out' }).click()
    await expect(page.getByRole('button', { name: 'Log in', exact: true })).toBeVisible()
  })

  test('wrong credentials show an error and a bad API route is never reachable without a token', async ({ page, request }) => {
    await page.goto('/')
    await page.getByLabel('Email').fill('nobody@showroom.test')
    await page.getByLabel('Password').fill('wrong-password')
    await page.getByRole('button', { name: 'Log in', exact: true }).click()
    await expect(page.getByRole('alert')).toContainText('Invalid email or password')
    expect((await request.get('http://localhost:4100/api/vehicles')).status()).toBe(401)
  })
})
