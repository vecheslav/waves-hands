import { TestBed } from '@angular/core/testing'

import { KeeperService } from './keeper.service'

describe('KeeperService', () => {
  beforeEach(() => TestBed.configureTestingModule({}))

  it('should be created', () => {
    const service: KeeperService = TestBed.get(KeeperService)
    expect(service).toBeDefined()
  })
})
