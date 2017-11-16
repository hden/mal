# mal
Make a Lisp (in BigQuery UDF)

```sql
#standardsql
create temp function mal (str string, args Array<float64>)
  returns float64
  language js as 'return mal.apply(str, args)'
  OPTIONS (
    library=['gs://hden/mal/bundle.js']
  )
;
create temp function mal (str string, a int64, b int64)
  returns int64
  language js as 'return mal.apply(str, [~~a, ~~b])'
  OPTIONS (
    library=['gs://hden/mal/bundle.js']
  )
;

select mal('+', 1, 3)
     , mal('(fn* [a b c] (reduce + 0 [a b c]))', [1.1, 2.2, 3.3])
```

## FAQ

### Why am I getting strings instead of int64?

> Because JavaScript does not support a 64-bit integer type, INT64 is unsupported in input or output types for JavaScript UDFs. Instead, use FLOAT64 to represent integer values as a number, or STRING to represent integer values as a string. https://cloud.google.com/bigquery/docs/reference/standard-sql/user-defined-functions#sql-type-encodings-in-javascript

### Does it support println or slurp

BigQuery UDF currently does not support `console.log()` or any kind of IO.
