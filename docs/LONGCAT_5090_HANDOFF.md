# Cornerstone LongCat / RTX 5090 交接包

更新日期：2026-07-25

## 已锁定的可用组合

| 项目 | 已验证版本 |
| --- | --- |
| GPU | NVIDIA GeForce RTX 5090（计算能力 `sm_120`） |
| NVIDIA 驱动 / GSP | `595.84` |
| PyTorch | `2.7.1+cu128`（CUDA 12.8） |
| xFormers | `0.0.31` |
| FlashAttention | **`2.8.0`，本机 CUDA 12.8 编译为 `sm_120`** |

本机已安装并保存的 wheel：

`/home/cornerstone/LongCat-Video/vendor/flash_attn-2.8.0-sm120-cp310-cp310-linux_x86_64.whl`

SHA-256：

`3474e7a6c3b4d235453d8740d7a620ad5650922d216f2146eb5c294936349cbb`

## 重要：不要替换为旧的 PyPI / 预编译 wheel

先前的 `flash-attn 2.7.4.post1` 二进制只包含 `sm_80` 和 `sm_90`，没有 RTX 5090 所需的 `sm_120`。LongCat 的 FlashAttention 2 变长注意力内核因此会触发：

```text
NVRM: Xid 79, GPU has fallen off the bus
RuntimeError: CUDA error: unspecified launch failure
```

请不要执行会覆盖当前包的命令，例如：

```bash
pip install flash-attn
pip install -U flash-attn
```

官方 `2.8.3.post1` 虽可构建 `sm_120`，但此环境的 xFormers 0.0.31 只接受 FlashAttention `<=2.8.0`，因此不能使用。

## 同事接手时的恢复命令

仅在确认包被覆盖、或新建了相同的 LongCat 环境时执行：

```bash
ssh cornerstone

/home/cornerstone/miniforge3/envs/ai-remotion-longcat/bin/pip install \
  --no-deps --force-reinstall \
  /home/cornerstone/LongCat-Video/vendor/flash_attn-2.8.0-sm120-cp310-cp310-linux_x86_64.whl
```

然后确认版本：

```bash
/home/cornerstone/miniforge3/envs/ai-remotion-longcat/bin/python -c \
  'import flash_attn, torch; print(flash_attn.__version__); print(torch.__version__, torch.version.cuda, torch.cuda.get_device_capability())'
```

预期输出包含：

```text
2.8.0
2.7.1+cu128 12.8 (12, 0)
```

## 已完成的验收

以下命令在 2026-07-25 完整通过：

```bash
cd /home/cornerstone/LongCat-Video
CUDA_VISIBLE_DEVICES=0 \
  /home/cornerstone/miniforge3/bin/conda run --no-capture-output \
  -n ai-remotion-longcat \
  torchrun --standalone --nproc_per_node=1 \
  run_demo_avatar_single_lowmem.py \
  --resolution 480p --num_segments 1 \
  --output_dir ./outputs_diagnostic_fa280_sm120
```

结果：8/8 个去噪步骤完成、视频已生成，且本次启动没有新的 NVIDIA Xid / GSP 错误。

验收输出：

`/home/cornerstone/LongCat-Video/outputs_diagnostic_fa280_sm120/segment_001.mp4`

## 若问题再次出现

1. 先执行上面的版本确认命令；不要先重装 NVIDIA 驱动。
2. 检查是否有人执行过 `pip install -U flash-attn`，或重建环境时用了未带 `sm_120` 的 wheel。
3. 用上面的持久 wheel 强制恢复 `2.8.0`。
4. 再运行同一条验收命令；若恢复正确版本后仍有 `Xid 79`，再进入 BIOS / PCIe / 硬件排查。

## 构建来源

- FlashAttention 官方 tag：`v2.8.0`
- 本机编译器：Conda NVIDIA `cuda-nvcc 12.8.93`
- 编译目标：`FLASH_ATTN_CUDA_ARCHS=120`（生成 `compute_120 -> sm_120`）

官方源码的 `setup.py` 在 CUDA 12.8+ 下支持 `sm_120`：<https://github.com/Dao-AILab/flash-attention/blob/v2.8.0/setup.py>

## AI-Remotion local service

The private FastAPI adapter is `services/longcat/server.py`. Run it inside the
`ai-remotion-longcat` environment with `LONGCAT_DIR=/home/cornerstone/LongCat-Video`
and bind it only to the private network (recommended port: `8006`). Its
`POST /generate` contract accepts a consented image plus 16kHz mono PCM WAV and
returns a silent MP4; the Remotion pipeline muxes the approved scene audio.

Keep the RTX 5090 at a 400W power limit before starting LongCat inference:

```bash
sudo nvidia-smi -i 0 -pl 400
```
