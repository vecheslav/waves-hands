import { AppPage } from './app.po'

describe('workspace-project App', () => {
  let page: AppPage

  beforeEach(() => {
    page = new AppPage()
  })

  it('should display preview message', () => {
    page.navigateTo()
    expect(page.getTitleText()).toEqual('The first blockchain hands game!')
  })
})
