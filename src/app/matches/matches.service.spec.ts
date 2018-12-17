import { TestBed } from '@angular/core/testing'

import { MatchesService } from './matches.service'
import { HttpClientModule } from '@angular/common/http'
import { AuthModule } from '../auth/auth.module'

describe('MatchesService', () => {
  beforeEach(() => TestBed.configureTestingModule({ imports: [HttpClientModule, AuthModule] }))

  it('should be created', () => {
    const service: MatchesService = TestBed.get(MatchesService)
    expect(service).toBeDefined()
  })

})
