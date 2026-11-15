export type Usuario = {
  id: string;
  email: string;
};

export type SesionRemota = {
  token: string;
  refreshToken: string;
  expiraEnSeg: number;
};

export type SesionGuardada = {
  token: string;
  refreshToken: string;
  usuario: Usuario;
  expiraEn: number;
};
