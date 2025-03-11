## Train a **Scikit-Learn model** (sklearn) and a generic preprocessing pipeline for the input tabular data.

The input data is loaded using [**pandas**](https://pandas.pydata.org), then it's preprocessed in a generic way and the specified sklearn model is trained on it.

The algorithm requires two input parameters, the dataset parameters, to tweak the training for the selected dataset, and the model paramenters, to select the trained model and its parameters.

As of now, the possible parameters are:

## dataset:
- **'separator': str (default=None)** separator character used to split the CSV. 
- **'target_column': str** name of the dataset training column.
- **'split': float[0-1] (default=0.7)** test to train split ratio. 
- **'random_state': int (default=42)** random seed to split the data with. 
- **'stratify': boolean (default=False)** to stratify the target column.

## model:
- **'name': str** name of the model to train, must be one of the valid *sci-kit learn* models. (See below)
- **'params': JSON** custom parameters for the selected *sci-kit learn* model, look up *sci-kit learn* docs for specifics.
- **'metrics': List[str]** list of valid *sci-kit learn* metrics to test the model with. (See below)

## Examples

For a regression problem:

```JSON
{
    "name": "KNeighborsRegressor",
    "params": {
        "weights": "distance"
    },
    "metrics": [
        "r2", 
        "neg_mean_squared_log_error"
        ]
}
```

For a classification problem:
```JSON
{
  "name": "KNeighborsClassifier",
  "params": {
    "metric": "l2",
    "n_jobs": -1
  },
  "metrics": [
    "balanced_accuracy", 
    "accuracy"
    ]
}
```

Dataset parameters:
```JSON
{
  "separator": ",",
  "target_column": "species",
  "split": 0.7,
  "random_state": 42,
  "stratify": true
}
```


## Valid *sci-kit learn* model names: (As of today)
(+200 estimators), look up at [sci-kit learn](https://scikit-learn.org/stable/modules/generated/sklearn.utils.discovery.all_estimators.html)
...

## Valid *sci-kit learn* metrics: (As of today)
(+50 metrics), look up at [sci-kit learn](https://scikit-learn.org/stable/modules/generated/sklearn.metrics.get_scorer_names.html)
...

1. **accuracy**
2. **adjusted_mutual_info_score**
3. **adjusted_rand_score**
4. **average_precision**
5. **balanced_accuracy**
6. **completeness_score**
7. **d2_absolute_error_score**
8. **explained_variance**
9. **f1**
10. **f1_macro**
11. **f1_micro**
12. **f1_samples**
13. **f1_weighted**
14. **fowlkes_mallows_score**
15. **homogeneity_score**
16. **jaccard**
17. **jaccard_macro**
18. **jaccard_micro**
19. **jaccard_samples**
20. **jaccard_weighted**
21. **matthews_corrcoef**
22. **mutual_info_score**
23. **neg_brier_score**
24. **neg_log_loss**
25. **neg_max_error**
26. **neg_mean_absolute_error**
27. **neg_mean_absolute_percentage_error**
28. **neg_mean_gamma_deviance**
29. **neg_mean_poisson_deviance**
30. **neg_mean_squared_error**
31. **neg_mean_squared_log_error**
32. **neg_median_absolute_error**
33. **neg_negative_likelihood_ratio**
34. **neg_root_mean_squared_error**
35. **neg_root_mean_squared_log_error**
36. **normalized_mutual_info_score**
37. **positive_likelihood_ratio**
38. **precision**
39. **precision_macro**
40. **precision_micro**
41. **precision_samples**
42. **precision_weighted**
43. **r2**
44. **rand_score**
45. **recall**
46. **recall_macro**
47. **recall_micro**
48. **recall_samples**
49. **recall_weighted**
50. **roc_auc**
51. **roc_auc_ovo**
52. **roc_auc_ovo_weighted**
53. **roc_auc_ovr**
54. **roc_auc_ovr_weighted**
55. **top_k_accuracy**
56. **v_measure_score**
