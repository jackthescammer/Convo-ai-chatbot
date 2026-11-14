"""Model backends.

Everything that talks to a language model goes through `Backend.generate`, so a
different model can be tested by changing one line (or the CONVO_MODEL
environment variable) without touching the rest of the app.
"""

import os

DEFAULT_MODEL = "Qwen/Qwen2.5-3B-Instruct"


class Backend:
    """Interface: turn a chat message list into a text reply."""

    name = "base"

    def generate(self, messages, *, max_new_tokens=300, temperature=0.0):
        raise NotImplementedError


class QwenBackend(Backend):
    """Hugging Face Transformers chat model (default: Qwen2.5-3B-Instruct)."""

    def __init__(self, model_id=DEFAULT_MODEL, device=None):
        import torch
        from transformers import AutoModelForCausalLM, AutoTokenizer

        self.name = model_id
        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")
        dtype = torch.float16 if self.device == "cuda" else torch.float32
        self.tok = AutoTokenizer.from_pretrained(model_id)
        self.model = AutoModelForCausalLM.from_pretrained(model_id, torch_dtype=dtype).to(self.device)
        self.model.eval()

    def generate(self, messages, *, max_new_tokens=300, temperature=0.0):
        import torch

        # return_dict=True: newer transformers versions return a dict, not a tensor.
        inputs = self.tok.apply_chat_template(
            messages, add_generation_prompt=True, return_tensors="pt", return_dict=True
        ).to(self.model.device)
        kwargs = {"max_new_tokens": max_new_tokens, "pad_token_id": self.tok.eos_token_id}
        if temperature > 0:
            kwargs.update(do_sample=True, temperature=temperature, top_p=0.9)
        else:
            kwargs.update(do_sample=False)
        with torch.no_grad():
            out = self.model.generate(**inputs, **kwargs)
        new_tokens = out[0][inputs["input_ids"].shape[1]:]
        return self.tok.decode(new_tokens, skip_special_tokens=True).strip()


def load_backend(model_id=None):
    """Load the model named by `model_id`, else $CONVO_MODEL, else the default.

    The chosen model is always printed so a model is never swapped silently.
    """
    model_id = model_id or os.environ.get("CONVO_MODEL") or DEFAULT_MODEL
    print(f"[convo] loading model: {model_id}")
    backend = QwenBackend(model_id)
    print(f"[convo] loaded {backend.name} on {backend.device}")
    return backend
