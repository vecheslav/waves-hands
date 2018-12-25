import { HttpClient } from '@angular/common/http'
import { IHttp } from './api'

export const fromAngular = (http: HttpClient): IHttp => ({
  get: <T>(url: string) => {
    return http.get<T>(url).toPromise()
  },
  post: <T>(url: string, data: any) => {
    return http.post<T>(url, data).toPromise()
  }
})
