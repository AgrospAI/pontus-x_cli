Generate an **Exploratory Data Analysis** (EDA) report for the input tabular data.

The input data is loaded using [**pandas**](https://pandas.pydata.org) and then the EDA report is generated using [**YData Profiling**](https://ydata-profiling.ydata.ai). The HTML version of the report can be downloaded when the algorithm finishes.

👑 **Sovereignty by design**: this algorithm is executed following the Compute-to-Data approach on the input dataset. This way, consumers get access just to the computation results, the EDA report in this case, not the raw data that remains in control of its data holder.

⚠️ **Warning**: this version of EDA includes samples of the input data in the generated report, so it is not recommended for sensitive data. For datasets including personal or sensitive data, the recommendation is to authorise to compute on them the [Sensitive Exploratory Data Analysis](https://portal.agrospai.udl.cat/asset/did:op:80d669824854177e42fe4e23f42ba5f7e9823d8ac6f9f224fec157e25d5f04da) version of the algorithm instead of this one.

The report includes the following information:

### Data Quality Alerts

![Data Quality Alerts](https://docs.profiling.ydata.ai/latest/_static/img/warnings_section.png)

### Univariate Profiling

![Univariate Profiling](https://docs.profiling.ydata.ai/latest/_static/img/univariate_profiling.png)

### Multivariate Profiling

![Multivariate Profiling](https://docs.profiling.ydata.ai/latest/_static/img/multivariate_profiling.png)
