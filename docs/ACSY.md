# ACSY / ACI Bound

- Paper: Isaac Gibbs & Emmanuel Candès, *Adaptive Conformal Inference Under Distribution Shift*, NeurIPS 2021 (arXiv:2106.00170).
- Update rule: $\alpha_{t+1} = \alpha_t + \gamma (\alpha_{\text{target}} - \text{err}_t)$ where $\text{err}_t = \mathbf{1}\{e_t > m_t\}$.
- Exact telescoping identity: $\sum_{t=1}^T (\alpha_{t+1} - \alpha_t) = \alpha_{T+1} - \alpha_1 = \gamma \sum_{t=1}^T (\alpha_{\text{target}} - \text{err}_t)$.
- Exact coverage error bound (Theorem 4.1):
  $$\left| \frac{1}{T} \sum_{t=1}^T \text{err}_t - \alpha_{\text{target}} \right| = \frac{|\alpha_1 - \alpha_{T+1}|}{\gamma T} \le \frac{1}{\gamma T}$$
- Clamped parameter space $\alpha_t \in [0, 1]$ ensures $|\alpha_1 - \alpha_{T+1}| \le 1$.
- Parameters: $\gamma = 0.02$, $\alpha_{\text{target}} = 0.10$. At $T = 52$ weeks, bound $\le \frac{1}{0.02 \times 52} \approx 0.9615$; at $T = 156$ weeks, bound $\le 0.3205$.
- Scope: Long-run average miscoverage tracks $\alpha_{\text{target}}$ without distributional assumptions; not a per-week guarantee.
