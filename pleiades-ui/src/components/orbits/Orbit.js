export default class Orbit {
  constructor({ a, e, periodDays, incl=0, Omega=0, w=0, mean_anomaly=0 }) {
    this.a = a;
    this.e = e;
    this.periodDays = periodDays;
    this.incl = incl;     // i
    this.Omega = Omega;   // Ω
    this.w = w;   // ω
    this.mean_anomaly = mean_anomaly;         // M at epoch
  }
  getRadPerDay() { return 2*Math.PI / this.periodDays; }
}