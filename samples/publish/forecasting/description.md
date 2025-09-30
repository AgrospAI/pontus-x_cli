# Train a Scikit-Learn model (sklearn) and a generic preprocessing pipeline for the input tabular data.

The input data is loaded using pandas, then it's preprocessed in a generic way and the specified sklearn model is trained on it.

The algorithm requires two input parameters, the dataset parameters, to tweak the training for the selected dataset, and the model paramenters, to select the trained model and its parameters.

As of now, the possible parameters are:
## dataset:

- *'separator': str (default=None)* separator character used to split the CSV.
- *'target_column': str* name of the dataset training column.
- *'datetime_column': str* name of the dataset datetime column used for periodicity.
- *'split': float[0-1] (default=0.7)* test to train split ratio.
- *'lags': int (default=3)* lags to add into the data.
- *'periodicity': list[Literal["day" | "week" | "month" | "year"]] (default=["day", "week", "month", "year"])* to add different periodicity info to your data.

## model:

- _'name': str_ name of the model to train, must be one of the valid scikit-learn models. (See below)
- _'params': JSON_ custom parameters for the selected scikit-learn model, look up scikit-learn docs for specifics.
- _'metrics': List[str]_ list of valid scikit-learn metrics to test the model with. (See below)

## Examples

For a regression problem:

```
{
    "name": "AdaBoostRegressor",
    "parameters": {
        "n_estimators": 500,
        "learning_rate": 0.05,
        "loss": "linear"
    },
    "metrics": [
        "neg_mean_squared_error"
    ]
}
```

Dataset parameters:

```
{
  "separator": ",",
  "target_column": "Sales",
  "datetime_column": "Date",
  "split": 0.7,
  "lags": 3,
  "periodicity": [
    "day",
    "week",
    "month",
    "year"
  ],
  "is_zipped": false
}
```

## Valid scikit-learn model names: (As of today)

(+200 estimators), look up at scikit-learn
...

## Valid scikit-learn metrics: (As of today)

(+50 metrics), look up at scikit-learn
...
