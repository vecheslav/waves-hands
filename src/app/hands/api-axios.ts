import axios from 'axios'
import { IHttp } from './api'

export const axiosHttp: IHttp = {
  get: <T>(url: string) => axios.get<T>(url).then(x => x.data as T),
  post: <T>(url: string, data: any) => axios.post<T>(url, data).then(x => x.data as T),
}