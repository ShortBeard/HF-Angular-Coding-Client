import { Injectable } from '@angular/core';
import { HttpClient, HttpParams, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class ApiService {
  constructor(private http: HttpClient) {}

  APIGetSprints(): Observable<{ values: any[] }> {
    return this.http.get<{ values: any[] }>(
      'http://localhost:8081/api/Sprints'
    );
  }

  APIGetTeamMembers(): Observable<any[]> {
    return this.http.get<any[]>('http://localhost:8081/api/TeamMembers');
  }

  APIGetJiras(
    email: string,
    key: string
  ): Observable<{ requestSuccess?: boolean; issues: any[] }> {
    //requestSuccess set as optional, as this is likely not a real value returned from Jiras actual API. This is just a value from my local API.
    let basicAuthHeaderString = 'Basic ' + window.btoa(email + ':' + key);

    const headers = new HttpHeaders({
      Authorization: basicAuthHeaderString,
    });
    return this.http.get<{ requestSuccess?: boolean; issues: any[] }>(
      'http://localhost:8081/api/Jira',
      {
        headers: headers,
      }
    );
  }

  APIGetPublicHolidays(params: HttpParams): Observable<{ items: any[] }> {
    return this.http.get<{ items: any[] }>(
      'http://localhost:8081/api/PublicHoliday',
      { params }
    );
  }
}
