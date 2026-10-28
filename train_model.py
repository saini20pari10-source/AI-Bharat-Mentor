from sklearn.linear_model import LinearRegression
import joblib

print("AI Training Started!")

hours = [[1], [2], [3], [4], [5], [6]]
scores = [20, 35, 45, 60, 75, 85]

model = LinearRegression()
model.fit(hours, scores)

print("AI Model Trained Successfully!")

prediction = model.predict([[7]])
print("Predicted Score:", round(prediction[0], 2))

joblib.dump(model, "my_ai_model.pkl")
print("AI Model Saved Successfully!")
