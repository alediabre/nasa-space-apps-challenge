import math 

G = 6.674e-11 # Constante gravitacional 
R_EARTH = 6371e3 # Radio de la tierra 

class MitigationMetrics: 
    def __init__(self,D_m,rho=3000,lead_years=6,vRel_kms=7):

        """
        Tendremos como entrada el diámetro y densidad del asteroide,
        el tiempo de aviso antes del impacto (en años) y la velocidad 
        relativa.        
        """ 
    
        self.D_m = D_m  
        self.rho = rho 
        self.lead_years=lead_years
        self.vRel_kms=7 


    
    def asteroid_mass(self): 
        return self.rho * math.pi * (self.D_m**3) / 6.0
    

    def dv_needed(self, target_miss_km):
        t_s = self.lead_years * 365.25 * 24 * 3600
        return (target_miss_km*1000) / max(t_s, 1)

    def dv_per_impactor(self, mImp_kg=1200, beta=3):
        return ((1+beta) * mImp_kg * self.vRel_kms*1000) / self.asteroid_mass()

    def dv_tractor(self, mSc_kg=20000, r_op_m=150):
        a = G*mSc_kg/(r_op_m**2)
        dv_per_year = a * 365.25*24*3600
        return dv_per_year, dv_per_year*self.lead_years

    def miss_distance_after_dv(self, miss_nominal_km, dv_mps, efficiency=1.0):
        """
        La miss_nominal es la distancia mínima que tendría si no hacemos mitigación. 
        dv_mps es el empujón que le metemos. 
        efficiency: factor de incertidumbre +-1, que nos diga cómo de eficaz es ese empujon
        
        
        """
        t_s = self.lead_years * 365.25 * 24 * 3600
        return miss_nominal_km*1000 + dv_mps * t_s * efficiency



    