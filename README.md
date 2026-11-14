# Scam text filter

**Track:** Finance
**Team:** TODO names

> This project is a prototype and is not financial advice.

## The problem
TODO: Who gets scam texts (name ONE specific person, e.g. a grandparent) and why does it matter? 2-3 sentences.

## What we built
A filter that reads a text message and says spam/scam or not. Input: a message. Output: spam or not spam. TODO: say how your person would use it.

## What we added
TODO: Our own data / user / question. (e.g. "We wrote N modern scam texts from [country] and tested whether a model trained on 2000s-era texts catches them.")

## How it works
- **Data:** SMS Spam Collection, 5,574 messages, ~13% spam. 80/20 train/test split, stratified so both have the same share of spam.
- **Model:** TF-IDF features + logistic regression (simple, fast, and we can see which words drive each flag).

## Results
| | Accuracy | Spam recall | Spam precision |
|---|---|---|---|
| Baseline (always "not spam") | TODO | 0 | n/a |
| Our model | TODO | TODO | TODO |
| Model on our own modern scams | TODO | TODO | TODO |

All numbers are on test data the model never saw in training.

**Where it fails:** TODO: paste 1-2 wrong examples from the notebook and say why you think it got them wrong.

## What we'd do next
TODO: 1-2 concrete steps.

## Sources
- SMS Spam Collection (UCI): https://archive.ics.uci.edu/dataset/228/sms+spam+collection
- scikit-learn: https://scikit-learn.org
- AI tools used: TODO (e.g. Claude, for help writing starter code)
