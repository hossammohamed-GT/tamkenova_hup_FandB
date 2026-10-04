import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { environment } from '../../environments/environment';
import { StrategicPartner } from '../models/partner.model';

@Injectable({ providedIn: 'root' })
export class PartnersService {
  private http = inject(HttpClient);
  private baseUrl = `${environment.apiUrl}/partners`;
  listPublic() { return this.http.get<StrategicPartner[]>(this.baseUrl); }
  listAll() { return this.http.get<StrategicPartner[]>(`${this.baseUrl}/admin`); }
  create(payload: Partial<StrategicPartner>) { return this.http.post<StrategicPartner>(this.baseUrl, payload); }
  update(id: string, payload: Partial<StrategicPartner>) { return this.http.patch<StrategicPartner>(`${this.baseUrl}/${id}`, payload); }
  remove(id: string) { return this.http.delete<{ success: boolean }>(`${this.baseUrl}/${id}`); }
}
