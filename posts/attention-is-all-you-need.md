The Transformer (Vaswani et al., 2017) dropped recurrence and convolutions entirely and built a sequence model out of attention alone. These are my notes on the core ideas: scaled dot-product attention, multi-head attention, and positional encodings.

## Why get rid of recurrence?

RNNs process tokens one at a time, so the computation for step $t$ has to wait for step $t-1$. That makes training hard to parallelize, and information from far-away tokens has to pass through many steps to arrive. Attention connects every pair of positions directly, in a constant number of operations.

## Scaled dot-product attention

Each token is projected into a query $q$, a key $k$ and a value $v$. Stacking them into matrices $Q$, $K$, $V$:

$$
\mathrm{Attention}(Q, K, V) = \mathrm{softmax}\!\left(\frac{QK^\top}{\sqrt{d_k}}\right) V
$$

The $\sqrt{d_k}$ scaling matters: for large $d_k$, dot products grow large in magnitude and push the softmax into regions with tiny gradients.

```python
import torch
import torch.nn.functional as F

def attention(q, k, v, mask=None):
    scores = q @ k.transpose(-2, -1) / q.size(-1) ** 0.5
    if mask is not None:
        scores = scores.masked_fill(mask == 0, float("-inf"))
    return F.softmax(scores, dim=-1) @ v
```

## Multi-head attention

Instead of one attention over $d_{model}$ dimensions, the model runs $h$ heads in parallel on lower-dimensional projections and concatenates the results:

- each head uses $d_k = d_v = d_{model} / h$ (in the paper, $h = 8$ and $d_k = 64$)
- different heads can attend to different kinds of relationships
- the total cost is similar to single-head attention at full dimension

## Positional encodings

Attention by itself is permutation-invariant, so order is injected with sinusoidal encodings:

$$
PE_{(pos, 2i)} = \sin\!\left(pos / 10000^{2i/d_{model}}\right), \quad
PE_{(pos, 2i+1)} = \cos\!\left(pos / 10000^{2i/d_{model}}\right)
$$

> Takeaway: attention gives every token a direct path to every other token, which is what made the Transformer both faster to train and better at long-range dependencies.
