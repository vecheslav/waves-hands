import { TestBed } from '@angular/core/testing'

import { MatchesService } from './matches.service'
import { AuthModule } from '../auth/auth.module'
import { HttpClientModule } from '@angular/common/http'
import { CoreService } from '../core/core.service'
import { KeeperServiceMock } from '../auth/__mocks__/keeper.service'
import { KeeperService } from '../auth/keeper.service'
import { CoreServiceMock } from '../core/__mocks__/core.service'

describe('MatchesService', () => {
  beforeEach(() => TestBed.configureTestingModule({
    imports: [
      AuthModule,
      HttpClientModule,
    ],
    providers: [
      { provide: KeeperService, useValue: new KeeperServiceMock() },
      { provide: CoreService, useValue: new CoreServiceMock() }
    ]
  }))

  // it('should be created', () => {
  //   const service: MatchesService = TestBed.get(MatchesService)
  //   expect(service).toBeDefined()
  // })

  // it('match should be created', async () => {
  //   const service: MatchesService = TestBed.get(MatchesService)
  //   const match = await service.createMatch([0, 1, 2])

  //   console.log(match)
  // })

  // it('getMatchList', async () => {
  //   const service: MatchesService = TestBed.get(MatchesService)
  //   const matches = await service.getMatchList()
  //   console.log(matches)
  // })

   it('getMatch', async () => {
     const service: MatchesService = TestBed.get(MatchesService)
     const matches = await service.getMatch('3ND5M2ZTSjWFCpizvg3PD2KXzh7Di3xkD9d')
     console.log(matches)
   })
})
